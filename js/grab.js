// File: js/grab-logic.js

/**
 * Menginisialisasi logika pengambilan item (VR & Non-VR)
 * @param {BABYLON.Scene} scene - Scene Babylon.js
 * @param {BABYLON.WebXRDefaultExperience} xr - Helper WebXR
 */
function setupGrabLogic(scene, xr) {

    /**
     * Fungsi helper yang dieksekusi saat item diambil.
     * @param {BABYLON.AbstractMesh} pickedMesh Mesh yang di-pick (wrapper/rootMesh)
     */
    function pickUpItem(pickedMesh) {
        // Cek metadata yang sudah ditambahkan di loadItem
        if (pickedMesh && pickedMesh.metadata && pickedMesh.metadata.isGrabbable) {
            
            console.log("ITEM DIAMBIL:", pickedMesh.metadata.itemData.title);

            // --- Aksi "Mengambil" ---
            // setEnabled(false) adalah cara terbaik untuk "menghilangkan" item:
            // 1. Menyembunyikan item (visual GLB)
            // 2. Menyembunyikan tombol "i" (karena parent-nya sama)
            // 3. Menonaktifkan fisikanya
            pickedMesh.setEnabled(false);
            
            // Opsional: Jika ingin dihapus permanen dari scene, gunakan:
            // pickedMesh.dispose(); 
        }
    }

    // Listener utama untuk semua input (VR Trigger Kanan & Mouse Klik Kiri)
    scene.onPointerObservable.add((pointerInfo) => {
        
        // Hanya deteksi saat tombol DITEKAN
        if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
            
            // Pastikan pickInfo ada dan mengenai sesuatu
            const pickResult = pointerInfo.pickInfo;
            if (!pickResult || !pickResult.hit || !pickResult.pickedMesh) {
                return; // Tidak kena apa-apa, abaikan
            }
            const pickedMeshName=pickResult.pickedMesh.name;
            if(pickedMeshName.startsWith("btn_plane_")||pickedMeshName==="infoPlane"){
                return;
            }

            const event=pointerInfo.event;

            if (event.pointerType==="mouse") {
                if(event.button!==0){
                    console.log("Input mouse kiri");
                    pickUpItem(pickResult.pickedMesh);
                }
            }
            else if(event.pointerType==="xr-input-source"){
                const inputSource = pointerInfo.inputSource;

                // Cek apakah event ini berasal dari controller,
                // DAN apakah controller itu tangan KANAN
                if (inputSource && inputSource.handedness === 'right') {
                    
                    // Ini adalah 'Right Trigger'
                    pickUpItem(pickResult.pickedMesh);
                }
            }
            // Cek apakah sedang dalam mode VR
            // (Gunakan "xr && ..." untuk keamanan jika xr gagal inisialisasi)
        }
    });

    console.log("✅ Logika Grab (pickUpItem) dari file eksternal aktif.");
}
