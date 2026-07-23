// Substitua sua função init3D atual por esta no arquivo script.js

function init3D() {
    const container = document.getElementById('canvas-container');
    scene = new THREE.Scene();
    // Fundo cinza super escuro para dar contraste
    scene.background = new THREE.Color(0x0a0a0c); 
    
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(5, 3, 7);
    
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(window.devicePixelRatio); // Texturas nítidas em telas Retina/4K
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping; // Cores de cinema
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);
    
    // O SEGREDO DO REALISMO: Ambiente HDR (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
    
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.8; // Rotação elegante e lenta
    controls.maxPolarAngle = Math.PI / 2 + 0.1; // Impede a câmera de ir muito para baixo do chão

    animate();
}