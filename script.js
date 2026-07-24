// ============================================================
// CONFIGURADOR 3D - script.js completo
// ============================================================
let scene, camera, renderer, controls;
const loadedModels = {};
const selectedItems = {};
let catalogo = {};
const loader = new THREE.GLTFLoader();

function init3D() {
    const container = document.getElementById('canvas-container');
    if (!container) { console.error('Elemento #canvas-container não encontrado no DOM.'); return; }

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0c);

    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(5, 3, 7);

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.8;
    controls.maxPolarAngle = Math.PI / 2 + 0.1;

    window.addEventListener('resize', onWindowResize);
    animate();
}

function onWindowResize() {
    const container = document.getElementById('canvas-container');
    if (!container || !camera || !renderer) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    if (renderer && scene && camera) renderer.render(scene, camera);
}

async function carregarCatalogo() {
    try {
        const resp = await fetch('catalogo.json');
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        catalogo = await resp.json();
        renderUI();
    } catch (err) {
        mostrarErro('Não foi possível carregar o catálogo (catalogo.json). ' + err.message);
        console.error(err);
    }
}

function renderUI() {
    const container = document.getElementById('controls-container');
    container.innerHTML = '';
    Object.keys(catalogo).forEach(categoriaKey => {
        const categoria = catalogo[categoriaKey];
        const block = document.createElement('div');
        block.className = 'category-block';
        const title = document.createElement('div');
        title.className = 'cat-title';
        title.textContent = categoria.title || categoriaKey;
        block.appendChild(title);
        const list = document.createElement('div');
        list.className = 'product-list';
        categoria.items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.dataset.categoria = categoriaKey;
            card.dataset.id = item.id;
            card.innerHTML = `
                <div class="prod-info">
                    <span class="prod-name">${item.name}</span>
                    <span class="prod-specs">${item.specs}</span>
                </div>
                <span class="prod-price">${formatarPreco(item.price)}</span>
            `;
            card.addEventListener('click', () => selecionarItem(categoriaKey, item, card));
            list.appendChild(card);
        });
        block.appendChild(list);
        container.appendChild(block);
    });
}

function formatarPreco(valor) {
    return (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function selecionarItem(categoriaKey, item, cardEl) {
    document.querySelectorAll(`.product-card[data-categoria="${categoriaKey}"]`)
        .forEach(el => el.classList.remove('selected'));
    cardEl.classList.add('selected');
    selectedItems[categoriaKey] = item;
    atualizarTotal();
    loadModel(categoriaKey, item);
}

function loadModel(categoriaKey, item) {
    mostrarLoading(true);
    esconderErro();
    loader.load(
        item.arquivo_3d,
        (gltf) => {
            if (loadedModels[categoriaKey]) {
                scene.remove(loadedModels[categoriaKey]);
                descartarObjeto(loadedModels[categoriaKey]);
            }
            const modelo = gltf.scene;
            modelo.scale.set(...(item.escala_3d || [1, 1, 1]));
            modelo.position.set(...(item.posicao_3d || [0, 0, 0]));
            scene.add(modelo);
            loadedModels[categoriaKey] = modelo;
            mostrarLoading(false);
        },
        undefined,
        (err) => {
            mostrarLoading(false);
            mostrarErro(`Falha ao carregar o modelo 3D de "${item.name}". Verifique a URL em arquivo_3d.`);
            console.error('Erro ao carregar GLB:', item.arquivo_3d, err);
        }
    );
}

function descartarObjeto(objeto) {
    objeto.traverse((child) => {
        if (child.isMesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                const materiais = Array.isArray(child.material) ? child.material : [child.material];
                materiais.forEach(mat => mat.dispose());
            }
        }
    });
}

function atualizarTotal() {
    const total = Object.values(selectedItems).reduce((soma, item) => soma + (item.price || 0), 0);
    document.getElementById('total-value').textContent = formatarPreco(total);
}

function mostrarLoading(visivel) {
    document.getElementById('loading-indicator').style.display = visivel ? 'block' : 'none';
}

function mostrarErro(mensagem) {
    const el = document.getElementById('error-toast');
    el.textContent = mensagem;
    el.style.display = 'block';
    clearTimeout(mostrarErro._timeout);
    mostrarErro._timeout = setTimeout(esconderErro, 6000);
}

function esconderErro() {
    document.getElementById('error-toast').style.display = 'none';
}

init3D();
carregarCatalogo();