/**
 * js/grab.js
 * * Berisi logika untuk interaksi Mouse Drag (Desktop) dan VR Grab (VR)
 * untuk item-item yang menggunakan physics wrapper.
 * * Fungsi ini dipanggil di akhir file HTML.
 */
function setupVRInput(xr, scene) {
    console.log("Menginisialisasi interaksi grab (VR & Mouse)...");

    // --- Variabel Bersama ---
    const highlightColor = new BABYLON.Color3.Green();
    
    // Massa asli item, sesuai dengan 'itemDatabase' di HTML
    const originalMass = 1; 


    // ============================================================
    // 1. MOUSE DRAG (Desktop)
    // ============================================================

    const hlMouse = new BABYLON.HighlightLayer("HL_MOUSE_PHYSICS", scene);

    // Iterasi semua mesh di scene untuk menemukan yang 'grabbable'
    scene.meshes.forEach((mesh) => {
        // Kita mencari 'wrapper' yang dibuat di HTML
        if (mesh.metadata && mesh.metadata.isGrabbable) {
            
            const wrapper = mesh;
            // Dapatkan model GLB di dalamnya (anak pertama) untuk di-highlight
            const childModel = wrapper.getChildren()[0];

            // Tambahkan behavior drag ke wrapper
            const dragBehavior = new BABYLON.PointerDragBehavior({});
            wrapper.addBehavior(dragBehavior);

            // Saat mulai di-drag
            dragBehavior.onDragStartObservable.add(() => {
                if (wrapper.physicsImpostor) {
                    // Matikan fisika sementara agar bisa di-drag
                    wrapper.physicsImpostor.setMass(0);
                    wrapper.physicsImpostor.sleep();
                }
                if (childModel) {
                    // Highlight semua mesh visual di dalam model GLB
                    childModel.getDescendants(false).forEach(m => {
                        hlMouse.addMesh(m, highlightColor);
                    });
                }
            });

            // Saat selesai di-drag
            dragBehavior.onDragEndObservable.add(() => {
                if (wrapper.physicsImpostor) {
                    // Kembalikan massa agar fisika aktif lagi
                    wrapper.physicsImpostor.setMass(originalMass);
                    wrapper.physicsImpostor.wakeUp();
                }
                hlMouse.removeAllMeshes();
            });
        }
    });

    // ============================================================
    // 2. VR GRAB (Virtual Reality)
    // ============================================================

    // Cek jika XR (VR) tidak aktif
    if (!xr) {
        console.warn("VR (xr) tidak aktif. VR Grab tidak diinisialisasi.");
        return; // Hentikan eksekusi jika tidak ada VR
    }

    const hlVR = new BABYLON.HighlightLayer("HL_VR_PHYSICS", scene);

    xr.input.onControllerAddedObservable.add((controller) => {
        controller.onMotionControllerInitObservable.add((motionController) => {
            
            // Dapatkan komponen tombol (trigger atau squeeze)
            const triggerComponent = motionController.getComponent("trigger");
            const squeezeComponent = motionController.getComponent("squeeze");
            const grabComponent = triggerComponent || squeezeComponent;
            
            if (!grabComponent) return;

            let grabbedMesh = null;
            // Gunakan 'grip' untuk posisi tangan yang lebih akurat
            const hand = controller.grip || controller.pointer; 

            grabComponent.onButtonStateChangedObservable.add((state) => {
                
                if (state.pressed) {
                    // --- COBA GRAB ---
                    if (grabbedMesh) return; // Sudah memegang sesuatu

                    let closestMesh = null;
                    let minDistance = 0.2; // Jarak maksimum grab (20cm)

                    // Cek semua item grabbable di scene
                    scene.meshes.forEach((mesh) => {
                        if (mesh.metadata && mesh.metadata.isGrabbable) {
                            const dist = BABYLON.Vector3.Distance(
                                mesh.getAbsolutePosition(),
                                hand.getAbsolutePosition()
                            );
                            if (dist < minDistance) {
                                minDistance = dist;
                                closestMesh = mesh;
                            }
                        }
                    });

                    // Jika ada item yang cukup dekat
                    if (closestMesh) {
                        grabbedMesh = closestMesh;

                        // Matikan fisika
                        if (grabbedMesh.physicsImpostor) {
                            grabbedMesh.physicsImpostor.setMass(0);
                            grabbedMesh.physicsImpostor.sleep();
                        }

                        // Parent-kan item (wrapper) ke tangan/controller
                        grabbedMesh.setParent(hand);

                        // Highlight model di dalamnya
                        const childModel = grabbedMesh.getChildren()[0];
                        if (childModel) {
                            childModel.getDescendants(false).forEach(m => {
                                hlVR.addMesh(m, highlightColor);
                            });
                        }
                    }

                } else {
                    // --- COBA RELEASE ---
                    if (grabbedMesh) {
                        
                        // Lepas parent dari tangan
                        grabbedMesh.setParent(null);

                        // Aktifkan lagi fisika
                        if (grabbedMesh.physicsImpostor) {
                            grabbedMesh.physicsImpostor.setMass(originalMass);
                            grabbedMesh.physicsImpostor.wakeUp();

                            // Beri 'lemparan' (velocity) berdasarkan gerakan tangan
                            const linearVelocity = hand.getLinearVelocity();
                            const angularVelocity = hand.getAngularVelocity();

                            if (linearVelocity) {
                                grabbedMesh.physicsImpostor.setLinearVelocity(
                                    linearVelocity.scale(1.5) // Sesuaikan pengali (1.5) jika lemparan terlalu kuat/lemah
                                );
                            }
                            if (angularVelocity) {
                                grabbedMesh.physicsImpostor.setAngularVelocity(
                                    angularVelocity.scale(1.5)
                                );
                            }
                        }

                        // Hapus highlight
                        hlVR.removeAllMeshes();
                        grabbedMesh = null;
                    }
                }
            });
        });
    });

    console.log("✅ Logika grab (Mouse & VR) berhasil diinisialisasi.");
}