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
 * Menyiapkan listener input khusus untuk VR (Controller).
 * @param {BABYLON.WebXRDefaultExperience} xr 
 * @param {BABYLON.Scene} scene
 */
function setupVRInput(xr, scene) {
    
    xr.input.onControllerAddedObservable.add((controller) => {
        console.log("VR Controller ditambahkan:", controller.inputSource.handedness);
        
        // Kita hanya peduli dengan controller KANAN
        controller.onMotionControllerInitObservable.add((motionController) => {
            
            // Cek lagi di sini untuk memastikan semua sudah siap
            if (motionController) {
                console.log("Motion Controller siap:", motionController.id, "Hand:", controller.inputSource.handedness);

                // Kita hanya peduli dengan controller KANAN
                if (controller.inputSource.handedness === 'right') {
                    
                    // 'motionController' di sini sudah DIJAMIN ada
                    const triggerComponent = motionController.getComponent(BABYLON.WebXRControllerComponent.TRIGGER);
                    
                    if (triggerComponent) {
                        // Saat tombol trigger berubah status (ditekan/dilepas)
                        triggerComponent.onButtonStateChangedObservable.add((component) => {
                            
                            // Cek apakah tombol DITEKAN
                            if (component.pressed) {
                                console.log("VR Trigger Kanan DITEKAN");

                                // Lakukan Raycast manual dari ujung controller
                                const ray = new BABYLON.Ray(
                                    controller.pointer.position, // Posisi awal ray (ujung pointer)
                                    controller.pointer.forward,  // Arah ray
                                    2.0 // Jarak ray (2 meter)
                                );
                                
                                const pickResult = scene.pickWithRay(ray);

                                // Cek apakah mengenai sesuatu
                                if (pickResult.hit && pickResult.pickedMesh) {
                                    const pickedMeshName = pickResult.pickedMesh.name;
                                    
                                    // Abaikan jika kena GUI
                                    if (pickedMeshName.startsWith("btn_plane_") || pickedMeshName === "infoPlane") {
                                        console.log("VR Grab: Kena GUI, diabaikan.");
                                        return;
                                    }
                                    
                                    // Ambil item
                                    console.log("VR Grab: Kena item ->", pickedMeshName);
                                    pickUpItem(pickResult.pickedMesh);
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
        
        // Hanya proses jika event dari MOUSE
        if (pointerInfo.event.pointerType !== 'mouse') {
            return;
        }

        // Hanya deteksi saat tombol DITEKAN
        if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
            
            // Pastikan pickInfo ada dan mengenai sesuatu
            const pickResult = pointerInfo.pickInfo;
            if (!pickResult || !pickResult.hit || !pickResult.pickedMesh) {
                return; // Tidak kena apa-apa, abaikan
            }

            // PERBAIKAN FREEZE (GUI)
            const pickedMeshName = pickResult.pickedMesh.name;
            if (pickedMeshName.startsWith("btn_plane_") || pickedMeshName === "infoPlane") {
                console.log("Mouse: Kena GUI, diabaikan.");
                return; // Ini adalah GUI, biarkan listener GUI yang menangani
            }

            // --- LOGIKA NON-VR (DESKTOP) ---
            if (pointerInfo.event.button === 0) { // 0 = Klik Kiri
                console.log("Mouse: Kena item ->", pickedMeshName);
                pickUpItem(pickResult.pickedMesh);
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
