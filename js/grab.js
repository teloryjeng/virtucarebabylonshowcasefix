/**
 * Menyiapkan listener input khusus untuk VR (Controller).
 * @param {BABYLON.WebXRDefaultExperience} xr 
 * @param {BABYLON.Scene} scene
 */
function setupVRInput(xr, scene) {
    
    xr.input.onControllerAddedObservable.add((controller) => {
        console.log("VR Controller ditambahkan:", controller.inputSource.handedness);

        let heldItem = null;
        
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

                                if (!heldItem) {
                                    const ray = new BABYLON.Ray(
                                        controller.pointer.position,
                                        controller.pointer.forward,
                                        5.0 // [DEBUG] Jarak ray diperpanjang jadi 5m
                                    );
                                    
                                    const pickResult = scene.pickWithRay(ray);

                                    if (pickResult.hit && pickResult.pickedMesh) {
                                        
                                        // [DEBUG] Log apa yang kena
                                        console.log("Raycast HIT:", pickResult.pickedMesh.name);
                                        
                                        const grabbableMesh = findGrabbableParent(pickResult.pickedMesh);
                                        
                                        if (grabbableMesh) {
                                            console.log("VR Grab: Memegang ->", grabbableMesh.name);
                                            
                                            // [PENTING] Nonaktifkan physics saat dipegang
                                            if (grabbableMesh.physicsImpostor) {
                                                console.log("Physics dinonaktifkan untuk:", grabbableMesh.name);
                                                grabbableMesh.physicsImpostor.setMass(0);
                                                // Anda mungkin juga perlu: grabbableMesh.physicsImpostor.sleep();
                                            }

                                            grabbableMesh.setParent(controller.pointer);
                                            heldItem = grabbableMesh;

                                        } else {
                                            // [DEBUG] Kena, tapi tidak grabbable
                                            console.log("Raycast HIT, tapi item tidak 'grabbable' (cek metadata).");
                                        }
                                    } else {
                                        // [DEBUG] Tidak kena apa-apa
                                        console.log("Raycast MISS (tidak kena objek).");
                                    }
                                }

                            } else {

                                // --- RELEASE ---
                                console.log("VR Trigger Kanan DILEPAS");

                                if (heldItem) {
                                    console.log("VR Release: Melepas ->", heldItem.name);
                                    
                                    // [PENTING] Lepas dari parent
                                    heldItem.setParent(null);
                                    
                                    // [PENTING] Aktifkan kembali physics
                                    if (heldItem.physicsImpostor) {
                                        console.log("Physics diaktifkan kembali untuk:", heldItem.name);
                                        heldItem.physicsImpostor.setMass(1); // Asumsi massa = 1
                                        heldItem.physicsImpostor.wakeUp();
                                    }
                                    
                                    heldItem = null;
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
