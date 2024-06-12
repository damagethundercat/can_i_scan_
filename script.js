document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('container');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = true;
    controls.maxPolarAngle = Math.PI / 2;
    controls.enableRotate = false; // 회전 비활성화
    controls.enableZoom = false; // 줌 비활성화

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5).normalize();
    scene.add(light);

    const initialCameraPosition = new THREE.Vector3(0, 0, 10);
    camera.position.copy(initialCameraPosition);
    controls.target.set(0, 0, 0);
    controls.update();

    const modelPath = 'my.glb';
    const targetPage = './model1/index.html';

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let objects = [];
    let mapPopupWindow;
    let modelInstance;
    let pointCloud;
    let textMesh;
    let lineSegments;

    // 드롭다운 메뉴 토글 기능 추가
    const readMeButton = document.getElementById('readMeButton');
    const dropdownContent = document.getElementById('dropdownContent');
    
    if (readMeButton) {
        readMeButton.addEventListener('click', function() {
            dropdownContent.classList.toggle('show');
        });
    } else {
        console.error('Element with id "readMeButton" not found');
    }

    // 마우스가 상단으로 올라갔을 때 블러 효과 적용
    window.addEventListener('mousemove', function(event) {
        if (event.clientY < window.innerHeight * 0.5) {
            container.style.filter = 'blur(10px)';
        } else {
            container.style.filter = 'none';
        }
    });

    // 텍스트 생성 함수
    function createText(text, font, size, position) {
        const textGeometry = new THREE.TextGeometry(text, {
            font: font,
            size: size,
            height: 0.1,
            curveSegments: 12,
        });
        const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.set(position.x, position.y, position.z);
        scene.add(textMesh);
        return textMesh;
    }

    function loadFontAndText() {
        const loader = new THREE.FontLoader();
        loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function(font) {
            const text = 'click here to start';
            const size = 1;
            const radius = 3; // 텍스트의 회전 반경 설정
            const angleStep = (2 * Math.PI) / text.length;

            textMesh = new THREE.Object3D();
            scene.add(textMesh);

            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                const angle = i * angleStep;
                const x = radius * Math.cos(angle);
                const z = radius * Math.sin(angle);
                const charMesh = createText(char, font, size, { x: -x, y: -3, z: z });
                textMesh.add(charMesh);
            }

            // 텍스트 플리커링 효과 추가
            function flickerTextMesh() {
                textMesh.children.forEach(child => {
                    child.visible = Math.random() > 0.5;
                });
                setTimeout(flickerTextMesh, Math.random() * 500);
            }

            flickerTextMesh();
        });
    }

    function loadModel() {
        const loader = new THREE.GLTFLoader();
        loader.load(modelPath, function(gltf) {
            modelInstance = gltf.scene;

            // 모델의 바운딩 박스를 계산
            const box = new THREE.Box3().setFromObject(modelInstance);
            const center = new THREE.Vector3();
            box.getCenter(center);
            
            // 모델을 중앙으로 이동
            modelInstance.position.sub(center);

            // 초기 위치 및 크기 설정
            const initialPosition = { x: 0, y: -5, z: 0 }; // y 값을 조절하여 모델을 하단으로 이동
            const initialScale = 8;
            modelInstance.position.set(initialPosition.x, initialPosition.y, initialPosition.z);
            modelInstance.scale.set(initialScale, initialScale, initialScale);

            // 모델을 정면으로 회전
            modelInstance.rotation.set(0, 0, 0);

            scene.add(modelInstance);

            // 모델의 모든 메시에 userData.page 설정
            modelInstance.traverse((child) => {
                if (child.isMesh) {
                    child.userData.page = targetPage;
                }
            });

            objects.push(modelInstance);
        }, undefined, function(error) {
            console.error('An error happened', error);
        });
    }

    function convertToPointCloud(object) {
        const pointsGeometry = new THREE.BufferGeometry();
        const vertices = [];
        const colors = [];
        const lineVertices = [];

        object.traverse((child) => {
            if (child.isMesh) {
                const position = child.geometry.attributes.position;
                let color = null;
                if (child.geometry.attributes.color) {
                    color = child.geometry.attributes.color;
                } else {
                    color = new THREE.Color(child.material.color);
                }

                const density = 2; // 밀도를 높이기 위해 샘플링 횟수를 늘림
                for (let i = 0; i < position.count; i++) {
                    vertices.push(position.getX(i), position.getY(i), position.getZ(i));
                    if (child.geometry.attributes.color) {
                        colors.push(color.getX(i), color.getY(i), color.getZ(i));
                    } else {
                        colors.push(color.r, color.g, color.b);
                    }

                    // 선 연결을 위한 점 추가
                    if (i < position.count - 1) {
                        lineVertices.push(
                            position.getX(i), position.getY(i), position.getZ(i),
                            position.getX(i + 1), position.getY(i + 1), position.getZ(i + 1)
                        );
                    }
                }
            }
        });

        pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        pointsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        const pointsMaterial = new THREE.PointsMaterial({ size: 0.05, vertexColors: true, transparent: true, opacity: 0.5 }); // 포인트 크기와 투명도 설정
        pointCloud = new THREE.Points(pointsGeometry, pointsMaterial);
        pointCloud.position.copy(object.position);
        pointCloud.scale.copy(object.scale);
        pointCloud.rotation.copy(object.rotation);

        scene.remove(object);
        scene.add(pointCloud);

        // 선 연결 추가
        const lineGeometry = new THREE.BufferGeometry();
        lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(lineVertices, 3));
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }); // 선 투명도 설정
        lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
        lineSegments.position.copy(object.position);
        lineSegments.scale.copy(object.scale);
        lineSegments.rotation.copy(object.rotation);
        scene.add(lineSegments);

        // 모델의 크기를 키워 화면 중앙에 위치시킴
        pointCloud.position.set(0, -3, 0);
        pointCloud.scale.set(20, 20, 20);

        if (lineSegments) {
            lineSegments.position.set(0, -3, 0);
            lineSegments.scale.set(20, 20, 20);
        }

        // 주위의 텍스트 삭제
        if (textMesh) {
            scene.remove(textMesh);
        }
    }

    function onMouseClick(event) {
        event.preventDefault();

        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        const intersects = raycaster.intersectObjects(objects, true);

        if (intersects.length > 0) {
            const selectedObject = intersects[0].object;

            if (!pointCloud) {
                convertToPointCloud(modelInstance);
                setTimeout(() => {
                    const page = selectedObject.userData.page;
                    if (page) {
                        const popupWindow = window.open(page, 'popupWindow', 'width=1920,height=1080,resizable');
                        mapPopupWindow = window.open('./map/index.html', 'mapPopup', 'width=500,height=500,resizable');
                        if (popupWindow && mapPopupWindow) {
                            popupWindow.focus();
                            popupWindow.resizeTo(1920,1080);
                            popupWindow.onresize = (_=>{ popupWindow.resizeTo(1920,1080); });
                            mapPopupWindow.focus();
                            mapPopupWindow.resizeTo(500,500);
                            mapPopupWindow.onresize = (_=>{ mapPopupWindow.resizeTo(500,500); });
                        } else {
                            alert('Popup blocked. Please allow popups for this website.');
                        }
                    }
                }, 1000); // 1초 후에 페이지 전환
            }
        }
    }

    function onDocumentMouseMove(event) {
        const title = document.getElementById("title");

        // 화면 높이에서 마우스 Y 위치에 비례하여 블러 정도를 계산
        const blurAmount = (event.clientY > window.innerHeight * 0.5) * 10; // 최대 블러값을 10으로 설정
        title.style.filter = `blur(${blurAmount}px)`;
    }

    window.addEventListener('resize', function() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    });

    window.addEventListener('click', onMouseClick, false);
    window.addEventListener('mousemove', onDocumentMouseMove, false);

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);

        // 모델이 회전하도록 애니메이션 추가
        if (modelInstance && !pointCloud) {
            modelInstance.rotation.y += 0.01; // 천천히 회전
        }

        if (pointCloud) {
            pointCloud.rotation.y += 0.01; // 포인트 클라우드도 천천히 회전
        }

        // 라인 세그먼트도 회전
        if (lineSegments) {
            lineSegments.rotation.y += 0.01;
        }

        // 텍스트도 모델과 함께 회전
        if (textMesh) {
            textMesh.rotation.y += 0.01; // 천천히 회전
        }
    }

    loadFontAndText();
    loadModel();
    animate();

    // "i" 글자 깜빡이기 효과 추가
    const changingTextElement = document.getElementById("changing-text");

    function flickerText() {
        changingTextElement.style.visibility = Math.random() > 0.5 ? 'visible' : 'hidden';
        setTimeout(flickerText, Math.random() * 500); // 0.5초 이내의 랜덤한 간격으로 깜빡임
    }

    flickerText();
});
