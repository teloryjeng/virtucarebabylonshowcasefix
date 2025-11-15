// File: js/grab-logic.js

/**
 * Fungsi helper yang dieksekusi saat item diambil.
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
 * [BARU] Mencari mesh grabbable dengan 'metadata.isGrabbable' dengan
 * mengecek mesh yang di-pick dan semua parent-nya.
 * Juga menangani pengecekan GUI.
 * * @param {BABYLON.AbstractMesh} startingMesh Mesh yang kena pick raycast
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
 * Menyiapkan listener input khusus untuk VR (Controller).
 * @param {BABYLON.WebXRDefaultExperience} xr 
 * @param {BABYLON.Scene} scene
 */
function setupVRInput(xr, scene) {
    
    xr.input.onControllerAddedObservable.add((controller) => {
        console.log("VR Controller ditambahkan:", controller.inputSource.handedness);
        
        controller.onMotionControllerInitObservable.add((motionController) => {
            
            if (motionController) {
                console.log("Motion Controller siap:", motionController.id, "Hand:", controller.inputSource.handedness);

                if (controller.inputSource.handedness === 'right') {
                    
                    const triggerComponent = motionController.getComponent(BABYLON.WebXRControllerComponent.TRIGGER);
                    
                    if (triggerComponent) {
                        triggerComponent.onButtonStateChangedObservable.add((component) => {
                            
                            if (component.pressed) {
                                console.log("VR Trigger Kanan DITEKAN");

                                const ray = new BABYLON.Ray(
                                    controller.pointer.position,
                                    controller.pointer.forward,
                                    2.0 // Jarak ray (2 meter)
                                );
                                
                                const pickResult = scene.pickWithRay(ray);

                                // Cek apakah mengenai sesuatu
                                if (pickResult.hit && pickResult.pickedMesh) {
                                    
                                    // [PERBAIKAN] Gunakan fungsi helper untuk mencari parent
                                    const grabbableMesh = findGrabbableParent(pickResult.pickedMesh);
                                    
                                    if (grabbableMesh) {
                                        console.log("VR Grab: Kena item ->", grabbableMesh.name);
                                        pickUpItem(grabbableMesh);
                                    } else {
                                        console.log("VR Grab: Kena mesh, tapi tidak grabbable:", pickResult.pickedMesh.name);
                                    }
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
                
                // [PERBAIKAN] Gunakan fungsi helper untuk mencari parent
                // Pengecekan GUI sudah ditangani di dalam findGrabbableParent
                const grabbableMesh = findGrabbableParent(pickResult.pickedMesh);
                
                if (grabbableMesh) {
                    console.log("Mouse: Kena item ->", grabbableMesh.name);
                    pickUpItem(grabbableMesh);
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
