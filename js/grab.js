// File: js/grab-logic.js

/**
 * Fungsi helper yang dieksekusi saat item diambil (NON-VR).
 * @param {BABYLON.AbstractMesh} pickedMesh Mesh yang di-pick (wrapper/rootMesh)
 */
function pickUpItem(pickedMesh) {
    // Cek metadata yang sudah ditambahkan di loadItem
    if (pickedMesh && pickedMesh.metadata && pickedMesh.metadata.isGrabbable) {
        
        console.log("ITEM DIAMBIL:", pickedMesh.metadata.itemData.title);

        // Aksi "Mengambil"
        pickedMesh.setEnabled(false);
    }
}

/**
 * Mencari mesh grabbable dengan 'metadata.isGrabbable' dengan
 * mengecek mesh yang di-pick dan semua parent-nya.
 * Juga menangani pengecekan GUI.
 * @param {BABYLON.AbstractMesh} startingMesh Mesh yang kena pick raycast
 * @returns {BABYLON.AbstractMesh | null} Mesh yang grabbable, atau null
 */
function findGrabbableParent(startingMesh) {
    let currentMesh = startingMesh;
    while (currentMesh) {
        
        // 1. Cek GUI Dulu (Paling Prioritas untuk diabaikan)
        const meshName = currentMesh.name;
        if (meshName.startsWith("btn_plane_") || meshName === "infoPlane") {
            return null; // Ini GUI, jangan di-grab
        }

        // 2. Cek Metadata Grabbable
        if (currentMesh.metadata && currentMesh.metadata.isGrabbable) {
            return currentMesh; // Ditemukan! Ini adalah mesh root yang grabbable
        }

        // 3. Pindah ke parent untuk cek di iterasi berikutnya
        currentMesh = currentMesh.parent;
    }
    return null; // Tidak ditemukan mesh grabbable di hierarki
}

/**
 * [BARU] Mencari PhysicsImpostor di mesh atau anak-anaknya (rekursif).
 * Ini PENTING karena impostor mungkin tidak ada di root mesh.
 * @param {BABYLON.AbstractMesh} mesh
 * @returns {BABYLON.PhysicsImpostor | null}
 */
function findPhysicsImpostor(mesh) {
    if (!mesh) return null;

    // 1. Cek di mesh itu sendiri
    if (mesh.physicsImpostor) {
        return mesh.physicsImpostor;
    }

    // 2. Cek di anak-anaknya
    const children = mesh.getChildren();
    for (let i = 0; i < children.length; i++) {
        // Kita hanya butuh AbstractMesh, bukan node/transform biasa
        if (children[i] instanceof BABYLON.AbstractMesh) {
            const impostor = findPhysicsImpostor(children[i]);
            if (impostor) {
                return impostor; // Ditemukan!
            }
        }
    }

    return null; // Tidak ditemukan
}


/**
 * [VERSI TERBARU]
 * Menyiapkan listener input khusus untuk VR (Controller)
 * dengan logika Hold, Release, dan Physics handling.
 * @param {BABYLON.WebXRDefaultExperience} xr 
 * @param {BABYLON.Scene} scene
 */
function setupVRInput(xr, scene) {
    
    xr.input.onControllerAddedObservable.add((controller) => {
        console.log("VR Controller ditambahkan:", controller.inputSource.handedness);

        // [MODIFIKASI] Kita simpan objek, berisi mesh root dan impostor-nya
        let heldItem = {
            mesh: null,
            impostor: null
        };
        
        controller.onMotionControllerInitObservable.add((motionController) => {
            
            if (motionController) {
                console.log("Motion Controller siap:", motionController.id, "Hand:", controller.inputSource.handedness);

                if (controller.inputSource.handedness === 'right') {
                    
                    const triggerComponent = motionController.getComponent(BABYLON.WebXRControllerComponent.TRIGGER);
                    
                    if (triggerComponent) {
                        
                        triggerComponent.onButtonStateChangedObservable.add((component) => {
                            
                            if (component.pressed) {
                                
                                // --- GRAB ---
                                console.log("VR Trigger Kanan DITEKAN");

                                if (!heldItem.mesh) { // Cek jika kita belum memegang apa-apa
                                    const ray = new BABYLON.Ray(
                                        controller.pointer.position,
                                        controller.pointer.forward,
                                        5.0 // Jarak ray 5m
                                    );
                                    
                                    const pickResult = scene.pickWithRay(ray);

                                    if (pickResult.hit && pickResult.pickedMesh) {
                                        
                                        console.log("Raycast HIT:", pickResult.pickedMesh.name);
                                        const grabbableMesh = findGrabbableParent(pickResult.pickedMesh);
                                        
                                        if (grabbableMesh) {
                                            console.log("VR Grab: Memegang ->", grabbableMesh.name);
                                            
                                            // [INTI BARU] Cari impostor di mesh atau anaknya
                                            const impostor = findPhysicsImpostor(grabbableMesh);
                                            
                                            if (impostor) {
                                                console.log("Physics impostor ditemukan, massa di-set ke 0.");
                                                impostor.setMass(0);
                                                // impostor.sleep(); // Opsional
                                            } else {
                                                console.log("Item grabbable, tapi tidak ada physics impostor.");
                                            }

                                            // [INTI BARU] Simpan referensi ke keduanya
                                            heldItem.mesh = grabbableMesh;
                                            heldItem.impostor = impostor;

                                            // Lakukan parenting
                                            grabbableMesh.setParent(controller.pointer);

                                        } else {
                                            console.log("Raycast HIT, tapi item tidak 'grabbable'.");
                                        }
                                    } else {
                                        console.log("Raycast MISS.");
                                    }
                                }

                            } else {

                                // --- RELEASE ---
                                console.log("VR Trigger Kanan DILEPAS");

                                if (heldItem.mesh) { // Cek jika kita sedang memegang sesuatu
                                    console.log("VR Release: Melepas ->", heldItem.mesh.name);
                                    
                                    // 1. Lepas dari parent
                                    heldItem.mesh.setParent(null);
                                    
                                    // 2. Aktifkan kembali physics (jika ada)
                                    if (heldItem.impostor) {
                                        console.log("Physics impostor diaktifkan kembali, massa di-set ke 1.");
                                        heldItem.impostor.setMass(1); // Atur ke massa aslinya (misal 1)
                                        heldItem.impostor.wakeUp();
                                    }
                                    
                                    // 3. Kosongkan referensi
                                    heldItem.mesh = null;
                                    heldItem.impostor = null;
                                }
                            }
                        });
                    } else {
                        console.warn("Tidak dapat menemukan komponen TRIGGER untuk controller kanan.");
                    }
                }
            }
        });
    });
}


/**
 * Menginisialisasi logika pengambilan item (VR & Non-VR)
 * @param {BABYLON.Scene} scene - Scene Babylon.js
 * @param {BABYLON.WebXRDefaultExperience} xr - Helper WebXR
 */
function setupGrabLogic(scene, xr) {

    // ===================================
    // 1. LOGIKA NON-VR (DESKTOP / MOUSE)
    // ===================================
    scene.onPointerObservable.add((pointerInfo) => {
        
        if (pointerInfo.event.pointerType !== 'mouse') {
            return;
        }

        if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
            
            const pickResult = pointerInfo.pickInfo;
            if (!pickResult || !pickResult.hit || !pickResult.pickedMesh) {
                return;
            }

            // --- LOGIKA NON-VR (DESKTOP) ---
            if (pointerInfo.event.button === 0) { // 0 = Klik Kiri
                
                // Gunakan fungsi helper untuk mencari parent
                const grabbableMesh = findGrabbableParent(pickResult.pickedMesh);
                
                if (grabbableMesh) {
                    console.log("Mouse: Kena item ->", grabbableMesh.name);
                    pickUpItem(grabbableMesh); // Logika mouse tetap 'ambil' (bukan hold)
                } else {
                    console.log("Mouse: Kena mesh, tapi tidak grabbable/GUI:", pickResult.pickedMesh.name);
                }
            }
        }
    });

    // ===================================
    // 2. LOGIKA VR (CONTROLLER)
    // ===================================
    if (xr) {
        setupVRInput(xr, scene);
    } else {
        console.warn("XR tidak diinisialisasi, logika grab VR dilewati.");
    }

    console.log("✅ Logika Grab (Hybrid) dari file eksternal aktif.");
}
