/**
 * Menyiapkan listener input khusus untuk VR (Controller).
 * @param {BABYLON.WebXRDefaultExperience} xr 
 * @param {BABYLON.Scene} scene
 */
function setupVRInput(xr, scene) {
    
    xr.input.onControllerAddedObservable.add((controller) => {
        console.log("VR Controller ditambahkan:", controller.inputSource.handedness);

        // [BARU] Variabel state untuk melacak item yang sedang dipegang oleh controller INI
        let heldItem = null;
        
        controller.onMotionControllerInitObservable.add((motionController) => {
            
            if (motionController) {
                console.log("Motion Controller siap:", motionController.id, "Hand:", controller.inputSource.handedness);

                // Kita hanya peduli dengan controller kanan untuk grab
                if (controller.inputSource.handedness === 'right') {
                    
                    const triggerComponent = motionController.getComponent(BABYLON.WebXRControllerComponent.TRIGGER);
                    
                    if (triggerComponent) {
                        
                        // [MODIFIKASI] Kita akan mengecek state 'pressed' (ditekan) dan 'released' (dilepas)
                        triggerComponent.onButtonStateChangedObservable.add((component) => {
                            
                            // 'component.pressed' akan bernilai 'true' saat ditekan, dan 'false' saat dilepas
                            if (component.pressed) {
                                
                                // --- AWAL LOGIKA GRAB (SAAT TRIGGER DITEKAN) ---
                                console.log("VR Trigger Kanan DITEKAN");

                                // Hanya lakukan raycast jika kita tidak sedang memegang apa-apa
                                if (!heldItem) {
                                    const ray = new BABYLON.Ray(
                                        controller.pointer.position, // Posisi controller
                                        controller.pointer.forward,  // Arah controller
                                        2.0 // Jarak ray (2 meter)
                                    );
                                    
                                    const pickResult = scene.pickWithRay(ray);

                                    // Cek apakah mengenai sesuatu
                                    if (pickResult.hit && pickResult.pickedMesh) {
                                        
                                        // Gunakan fungsi helper yang sudah ada
                                        const grabbableMesh = findGrabbableParent(pickResult.pickedMesh);
                                        
                                        if (grabbableMesh) {
                                            console.log("VR Grab: Memegang ->", grabbableMesh.name);
                                            
                                            // [INTI] Jadikan controller sebagai parent dari mesh
                                            grabbableMesh.setParent(controller.pointer);
                                            
                                            // [INTI] Simpan referensi item yang dipegang
                                            heldItem = grabbableMesh;

                                            // Kita TIDAK memanggil pickUpItem() lagi,
                                            // karena kita tidak ingin itemnya hilang.
                                        }
                                    }
                                }
                                // --- AKHIR LOGIKA GRAB ---

                            } else {

                                // --- AWAL LOGIKA RELEASE (SAAT TRIGGER DILEPAS) ---
                                console.log("VR Trigger Kanan DILEPAS");

                                // Cek apakah kita sedang memegang item
                                if (heldItem) {
                                    console.log("VR Release: Melepas ->", heldItem.name);

                                    // [INTI] Lepaskan item kembali ke scene (world)
                                    heldItem.setParent(null);
                                    
                                    // [INTi] Kosongkan referensi
                                    heldItem = null;
                                }
                                // --- AKHIR LOGIKA RELEASE ---
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
