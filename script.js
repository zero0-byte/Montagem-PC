let db = {};
const selections = { casing: null, mobo: null, cpu: null, gpu: null, ram: null };
const meshes = {};

// Variáveis do 3D
let scene, camera, renderer, controls;

// 1. INICIALIZAÇÃO: Buscar o banco de dados JSON
fetch('catalogo.json')
    .then(response => response.json())
    .then(data => {
        db = data;
        buildUI();
        init3D();
    })
    .catch(error => console.error("Erro ao carregar o catálogo:", error));

// 2. CONSTRUÇÃO DA INTERFACE (UI)
function buildUI() {
    const controlsContainer = document.getElementById('controls-container');
    
    Object.keys(db).forEach(cat => {
        const block = document.createElement('div');
        block.className = 'category-block';
        
        let listHTML = '';
        db[cat].items.forEach(item => {
            const priceFmt = item.price > 0 ? `R$ ${item.price.toFixed(2)}` : 'Incluso';
            listHTML += `
                <div class="product-card" data-cat="${cat}" data-id="${item.id}" onclick="selectItem('${cat}', '${item.id}')">
                    <div class="prod-info">
                        <div class="prod-name">${item.name}</div>
                        <div class="prod-price">${priceFmt}</div>
                    </div>
                </div>
            `;
        });

        block.innerHTML = `
            <div class="cat-title">${db[cat].title}</div>
            <div class="product-list" id="list-${cat}">
                ${listHTML}
            </div>
        `;
        controlsContainer.appendChild(block);
    });
}

// 3. LÓGICA DE SELEÇÃO E CÁLCULO
window.selectItem = function(cat, itemId) {
    document.querySelectorAll(`#list-${cat} .product-card`).forEach(el => el.classList.remove('selected'));
    const selectedCard = document.querySelector(`.product-card[data-cat="${cat}"][data-id="${itemId}"]`);
    if(selectedCard) selectedCard.classList.add('selected');

    const itemData = db[cat].items.find(i => i.id === itemId);
    selections[cat] = itemData;

    renderSystem();
};

function renderSystem() {
    let total = 0;
    let selectedCount = 0;

    Object.keys(selections).forEach(cat => {
        const item = selections[cat];
        if (meshes[cat]) { 
            scene.remove(meshes[cat]); 
            delete meshes[cat]; 
        }

        if (item) {
            total += item.price;
            selectedCount++;
            if(item.scale && item.scale[0] > 0) { 
                createDetailedMesh(cat, item);
            }
        }
    });

    // Cálculo exato de logística e frete
    const freteBaseTransportadora = 45.00;
    const freteTotal = selectedCount > 0 ? (freteBaseTransportadora * 2) : 0; 

    document.getElementById('total-price').innerText = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('frete-info').innerText = `Frete (Transportadora): ` + freteTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// 4. PRESETS
const presets = {
    office: { casing: "c1", mobo: "m1", cpu: "cp1", gpu: "g0", ram: "r1" },
    gamer: { casing: "c2", mobo: "m2", cpu: "cp2", gpu: "g2", ram: "r2" },
    streamer: { casing: "c3", mobo: "m3", cpu: "cp3", gpu: "g4", ram: "r3" }
};

window.loadPreset = function(type) {
    const p = presets[type];
    Object.keys(p).forEach(cat => {
        if(db[cat]) selectItem(cat, p[cat]);
    });
    document.getElementById('sidebar').scrollTo({ top: 0, behavior: 'smooth' });
};

// 5. MOTOR 3D
function init3D() {
    const container = document.getElementById('canvas-container');
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(6, 4, 8);
    
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    animate();
}

function createDetailedMesh(catKey, item) {
    const group = new THREE.Group();
    let geom, mat, mesh;
    
    // Converte a cor HEX do JSON para o formato do Three.js
    const itemColor = new THREE.Color(item.color);

    switch(catKey) {
        case 'casing':
            geom = new THREE.BoxGeometry(...item.scale);
            mat = new THREE.MeshPhysicalMaterial({ color: itemColor, transparent: true, opacity: 0.2, roughness: 0.1 });
            mesh = new THREE.Mesh(geom, mat);
            mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geom), new THREE.LineBasicMaterial({ color: 0x555555 })));
            group.add(mesh);
            
            const isWhite = item.color.toLowerCase() === "#ffffff";
            const shroud = new THREE.Mesh(new THREE.BoxGeometry(item.scale[0]-0.1, 0.8, item.scale[2]-0.1), new THREE.MeshStandardMaterial({ color: isWhite ? 0xdddddd : 0x111111 }));
            shroud.position.set(0, -item.scale[1]/2 + 0.4, 0);
            group.add(shroud);
            break;
            
        case 'mobo':
            mesh = new THREE.Mesh(new THREE.BoxGeometry(...item.scale), new THREE.MeshStandardMaterial({ color: itemColor, roughness: 0.8 }));
            group.add(mesh);
            if(item.detail) {
                const heat = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 1.2), new THREE.MeshStandardMaterial({ color: new THREE.Color(item.detail), metalness: 0.8 }));
                heat.position.set(0.1, 0.8, -0.4);
                group.add(heat);
            }
            group.position.set(-1.0, 0.4, 0);
            break;
            
        case 'gpu':
            mesh = new THREE.Mesh(new THREE.BoxGeometry(...item.scale), new THREE.MeshStandardMaterial({ color: itemColor, metalness: 0.6 }));
            group.add(mesh);
            if (item.fans) {
                const fanGeom = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
                const fanMat = new THREE.MeshStandardMaterial({ color: 0x050505 });
                const offset = item.scale[2] / (item.fans + 1);
                for(let i=1; i<=item.fans; i++) {
                    const fan = new THREE.Mesh(fanGeom, fanMat);
                    fan.rotation.x = Math.PI / 2;
                    fan.rotation.z = Math.PI / 2;
                    fan.position.set(item.scale[0]/2, 0, -item.scale[2]/2 + (offset * i));
                    group.add(fan);
                }
            }
            group.position.set(-0.4, -0.2, 0);
            break;
            
        case 'ram':
            const rGeom = new THREE.BoxGeometry(0.3, 0.8, 0.08);
            const rMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8 });
            for(let i=0; i<2; i++) {
                const stick = new THREE.Mesh(rGeom, rMat);
                stick.position.set(-0.9, 1.2, 0.2 + (i*0.2));
                if(item.rgb) {
                    const rgbTop = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.08), new THREE.MeshBasicMaterial({ color: 0x00d2ff }));
                    rgbTop.position.set(0, 0.4, 0);
                    stick.add(rgbTop);
                }
                group.add(stick);
            }
            break;
    }
    meshes[catKey] = group;
    scene.add(group);
}

function animate() {
    requestAnimationFrame(animate);
    if(controls) controls.update();
    if(renderer && scene && camera) renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    if(camera && renderer) {
        const container = document.getElementById('canvas-container');
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }
});