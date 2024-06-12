document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('container');
    const scene = new THREE.Scene();

    const aspect = window.innerWidth / window.innerHeight;
    const d = 20;
    const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableRotate = false;
    controls.enablePan = true;
    controls.panSpeed = 1.0;
    controls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN
    };
    controls.target.set(0, 0, 0);
    controls.update();

    const ambientLight = new THREE.AmbientLight(0x333333, 5);
    scene.add(ambientLight);

    const loader = new THREE.GLTFLoader();
    loader.load('../model1/poly1.glb', function(gltf) {
        const model = gltf.scene;
        scene.add(model);
        model.position.set(0, 0, 0);
        model.scale.set(5, 5, 5);
    }, undefined, function(error) {
        console.error('An error occurred loading the model', error);
    });

    camera.position.set(0, 20, 0);
    camera.lookAt(0, 0, 0);

    const cameraInfo = document.getElementById('camera-info');
    const cameraMarker = document.getElementById('camera-marker');

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);

        // 로컬 스토리지에서 카메라 위치를 읽어와 반영
        const cameraPosition = JSON.parse(localStorage.getItem('cameraPosition'));
        const cameraRotation = JSON.parse(localStorage.getItem('cameraRotation'));

        if (cameraPosition && cameraRotation) {
            camera.position.set(cameraPosition.x, cameraPosition.y + 20, cameraPosition.z); // y 좌표를 올려서 탑뷰 유지
            controls.target.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
            controls.update();

            // 카메라 위치 정보를 업데이트
            cameraInfo.innerHTML = `
                ${cameraPosition.x.toFixed(2)}<br>
                ${cameraPosition.y.toFixed(2)}<br>
                ${cameraPosition.z.toFixed(2)}
            `;

            // 카메라 마커의 위치를 업데이트
            const markerSize = 10; // 마커 크기 (픽셀)
            const halfMarkerSize = markerSize / 2;
            cameraMarker.style.left = `calc(50% - ${halfMarkerSize}px)`;
            cameraMarker.style.top = `calc(50% - ${halfMarkerSize}px)`;
        }
    }

    animate();

    window.addEventListener('resize', function() {
        const aspect = window.innerWidth / window.innerHeight;
        camera.left = -d * aspect;
        camera.right = d * aspect;
        camera.top = d;
        camera.bottom = -d;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
});
