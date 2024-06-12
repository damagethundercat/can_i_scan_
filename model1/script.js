document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('container');
    const modelDescription = document.getElementById('model-description');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    const controls = new THREE.PointerLockControls(camera, document.body);
    scene.add(controls.getObject());

    document.addEventListener('click', () => {
        controls.lock();
    }, false);

    let moveForward = false;
    let moveBackward = false;
    let moveLeft = false;
    let moveRight = false;
    let moveUp = false;
    let moveDown = false;
    let shiftPressed = false;
    const velocity = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const clock = new THREE.Clock();
    const moveSpeed = 80.0;
    const shiftMultiplier = 2.0;

    const onKeyDown = function(event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                moveForward = true;
                break;
            case 'ArrowLeft':
            case 'KeyD':
                moveLeft = true;
                break;
            case 'ArrowDown':
            case 'KeyS':
                moveBackward = true;
                break;
            case 'ArrowRight':
            case 'KeyA':
                moveRight = true;
                break;
            case 'KeyQ':
                moveDown = true;
                break;
            case 'KeyE':
                moveUp = true;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                shiftPressed = true;
                break;
        }
    };

    const onKeyUp = function(event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                moveForward = false;
                break;
            case 'ArrowLeft':
            case 'KeyD':
                moveLeft = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                moveBackward = false;
                break;
            case 'ArrowRight':
            case 'KeyA':
                moveRight = false;
                break;
            case 'KeyQ':
                moveDown = false;
                break;
            case 'KeyE':
                moveUp = false;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                shiftPressed = false;
                break;
        }
    };

    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    ambientLight = new THREE.AmbientLight(0x333333, 1);
    scene.add(ambientLight);

    const initialCameraPosition = new THREE.Vector3(0, 0, 0);
    camera.position.copy(initialCameraPosition);
    controls.getObject().position.copy(initialCameraPosition);

    let currentEnvMap = null;

    // 모델 로드
    const loader = new THREE.GLTFLoader();
    loader.load('poly1.glb', function(gltf) {
        const model = gltf.scene;
        scene.add(model);
        model.position.set(0, 0, 0);
        gltf.scene.scale.set(5, 5, 5);
        modelDescription.innerText = '';

        // 텍스트 생성 및 배치
        const texts = ["Hello", "World", "3D", "Text", "Float", "Random"];
        const textMeshes = [];
        const fontLoader = new THREE.FontLoader();

        const textArea = {
            xMin: -5,
            xMax: 5,
            yMin: 0,
            yMax: 2, // 텍스트를 하단으로 내리기 위해 Y 최대값을 2로 설정
            zMin: -5,
            zMax: 5
        };
        
        fontLoader.load('../Noto Sans KR_Regular.json', function(font) {
            const textMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
        
            texts.forEach((text, index) => {
                const textGeometry = new THREE.TextGeometry(text, {
                    font: font,
                    size: 1,
                    height: 0.2,
                    curveSegments: 12,
                    bevelEnabled: false
                });
        
                const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        
                // 텍스트를 지정된 영역 내에서 무작위로 배치
                textMesh.position.set(
                    Math.random() * (textArea.xMax - textArea.xMin) + textArea.xMin, // X 범위
                    Math.random() * (textArea.yMax - textArea.yMin) + textArea.yMin, // Y 범위
                    Math.random() * (textArea.zMax - textArea.zMin) + textArea.zMin  // Z 범위
                );
                
                // 초기 각도와 반지름 설정
                textMesh.userData.angle = Math.random() * Math.PI * 2; // 0 ~ 2π 사이의 무작위 각도
                textMesh.userData.radius = 5 + Math.random() * 5; // 5 ~ 10 사이의 무작위 반지름
                textMesh.userData.ySpeed = 0.02 + Math.random() * 0.03; // Y축 이동 속도
                textMesh.userData.rotationSpeed = 0.01 + Math.random() * 0.02; // 회전 속도
        
                scene.add(textMesh);
                textMeshes.push(textMesh);
            });
        });
        


        function animateTexts() {
            textMeshes.forEach(textMesh => {
                // 토네이도 회전 효과
                textMesh.userData.angle += textMesh.userData.rotationSpeed;
                textMesh.position.x = textMesh.userData.radius * Math.cos(textMesh.userData.angle);
                textMesh.position.z = textMesh.userData.radius * Math.sin(textMesh.userData.angle);
        
                // Y축으로 위아래로 이동
                textMesh.position.y += textMesh.userData.ySpeed;
                if (textMesh.position.y > 3 || textMesh.position.y < -3) {
                    textMesh.userData.ySpeed *= -1; // Y축 이동 방향 반전
                }
            });
        }
        

        const composer = new THREE.EffectComposer(renderer);
        const renderPass = new THREE.RenderPass(scene, camera);
        composer.addPass(renderPass);

        // DoF 효과 추가
        const bokehPass = new THREE.BokehPass(scene, camera, {
            focus: 200,
            aperture: 15,
            maxblur: 0.01,
            width: window.innerWidth,
            height: window.innerHeight
        });
        composer.addPass(bokehPass);

        const vhsShader = {
            uniforms: {
                "tDiffuse": { value: null },
                "time": { value: 0.0 },
                "nIntensity": { value: 0.5 },
                "sIntensity": { value: 0.05 },
                "sCount": { value: 4096 },
                "grayscale": { value: 0.7 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
            uniform sampler2D tDiffuse;
            uniform float time;
            uniform float nIntensity;
            uniform float sIntensity;
            uniform float sCount;
            uniform int grayscale;
            varying vec2 vUv;

            void main() {
                vec4 cTextureScreen = texture2D(tDiffuse, vUv);

                float x = vUv.x * vUv.y * time * 1000.0;
                x = mod(x, 13.0) * mod(x, 123.0);
                vec2 sc = vec2(sin(x * 6.28318530718), cos(x * 6.28318530718));
                vec2 uv1 = vUv + sc * nIntensity * 0.001;
                vec2 uv2 = vUv - sc * nIntensity * 0.001;
                vec4 cNoise = texture2D(tDiffuse, uv1) + texture2D(tDiffuse, uv2);

                vec3 cResult = cTextureScreen.rgb + cNoise.rgb * nIntensity;

                vec2 strip = vec2(sin(vUv.y * sCount), cos(vUv.y * sCount));
                cResult += cTextureScreen.rgb * vec3(strip.x, strip.y, strip.x) * sIntensity;

                if (grayscale == 1) {
                    cResult = vec3(cResult.r * 0.3 + cResult.g * 0.59 + cResult.b * 0.11);
                }

                // 채도를 낮추는 부분 추가
                float average = (cResult.r + cResult.g + cResult.b) / 3.0;
                cResult = mix(vec3(average), cResult, 0.5); // 0.5는 채도를 낮추는 정도를 조절하는 값

                gl_FragColor = vec4(cResult, cTextureScreen.a);
            }
            `
        };

        const vhsPass = new THREE.ShaderPass(vhsShader);
        vhsPass.renderToScreen = true;
        composer.addPass(vhsPass);

        const lensDistortionShader = {
            uniforms: {
                "tDiffuse": { value: null },
                "strength": { value: 3.5 },
                "height": { value: 1.0 },
                "aspectRatio": { value: 1.5 },
                "cylindricalRatio": { value: 1.0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, .7);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float strength;
                uniform float height;
                uniform float aspectRatio;
                uniform float cylindricalRatio;
                varying vec2 vUv;

                void main() {
                    vec2 uv = vUv;
                    vec2 uvCenter = vec2(0.5, 0.5);
                    vec2 texCoord = uv - uvCenter;
                    texCoord.y *= height / aspectRatio;
                    texCoord.x *= aspectRatio;
                    float radius = length(texCoord);
                    float distortion = smoothstep(0.35, 0.4, radius);
                    vec4 color = texture2D(tDiffuse, uv + texCoord * (strength * radius * (0.3 - distortion)));
                    color.rgb = mix(color.rgb, vec3(0.0), distortion);
                    gl_FragColor = color;
                }
            `
        };

        const lensDistortionPass = new THREE.ShaderPass(lensDistortionShader);
        lensDistortionPass.renderToScreen = true;
        composer.addPass(lensDistortionPass);

        const spotlight = new THREE.SpotLight(0xffffff, 1);
        spotlight.angle = Math.PI / 6;
        spotlight.penumbra = 0.5;
        spotlight.decay = 2;
        spotlight.distance = 500;
        spotlight.castShadow = true;
        spotlight.shadow.mapSize.width = 1024;
        spotlight.shadow.mapSize.height = 1024;
        scene.add(spotlight);

        function updateSpotlight() {
            spotlight.position.copy(camera.position);
            spotlight.target.position.set(
                camera.position.x + camera.getWorldDirection(new THREE.Vector3()).x,
                camera.position.y + camera.getWorldDirection(new THREE.Vector3()).y,
                camera.position.z + camera.getWorldDirection(new THREE.Vector3()).z
            );
            spotlight.target.updateMatrixWorld();
        }

        function animate() {
            requestAnimationFrame(animate);
            updateSpotlight();
            const delta = clock.getDelta();
            velocity.x -= velocity.x * 10.0 * delta;
            velocity.z -= velocity.z * 10.0 * delta;
            velocity.y -= velocity.y * 10.0 * delta;
            direction.z = Number(moveForward) - Number(moveBackward);
            direction.x = Number(moveRight) - Number(moveLeft);
            direction.y = Number(moveUp) - Number(moveDown);
            direction.normalize();

            const speed = shiftPressed ? moveSpeed * shiftMultiplier : moveSpeed;
            if (moveForward || moveBackward) velocity.z -= direction.z * speed * delta;
            if (moveLeft || moveRight) velocity.x -= direction.x * speed * delta;
            if (moveUp || moveDown) velocity.y -= direction.y * speed * delta;

            controls.getObject().translateX(velocity.x * delta);
            controls.getObject().translateY(velocity.y * delta);
            controls.getObject().translateZ(velocity.z * delta);

            animateTexts();

            composer.render();

            // 카메라 위치를 로컬 스토리지에 저장
            localStorage.setItem('cameraPosition', JSON.stringify(camera.position));
            localStorage.setItem('cameraRotation', JSON.stringify(camera.rotation));
        }

        animate();
    });

    window.addEventListener('resize', function() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    });
});
