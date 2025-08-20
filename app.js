const repoOwner = "TU_USUARIO";
const repoName = "TU_REPO";
const token = "TU_TOKEN"; // Token con permisos de repo
const branch = "main";

let recipes = [];
let editingIndex = null;

// Modal y form
const modal = document.getElementById('recipe-modal');
const addBtn = document.getElementById('add-recipe-btn');
const closeModal = document.querySelector('.close');
const form = document.getElementById('recipe-form');
const previewImg = document.getElementById('preview-img');
const takePhotoBtn = document.getElementById('take-photo');
const fileInput = document.getElementById('imagen-file');

addBtn.onclick = () => openModal();
closeModal.onclick = () => modal.style.display = 'none';
window.onclick = e => { if(e.target == modal) modal.style.display='none'; }

takePhotoBtn.onclick = () => fileInput.click();

fileInput.onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    previewImg.src = ev.target.result;
    previewImg.style.display = 'block';
  }
  reader.readAsDataURL(file);

  const base64 = await fileToBase64(file);
  const imageName = `imagenes/${Date.now()}_${file.name}`;
  const uploadedUrl = await uploadImageToGitHub(imageName, base64);
  document.getElementById('imagen').value = uploadedUrl;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

async function uploadImageToGitHub(path, base64Content) {
  const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${path}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: 'Subida de imagen',
      content: base64Content,
      branch
    })
  });
  const data = await res.json();
  return data.content.download_url;
}

// CRUD GitHub recetas.json
async function fetchRecipes() {
  const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/recetas.json?ref=${branch}`;
  const res = await fetch(url);
  const data = await res.json();
  const content = atob(data.content);
  recipes = JSON.parse(content);
  renderRecipes();
}

async function saveRecipesToGitHub() {
  const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/recetas.json`;
  const currentFile = await fetch(url + `?ref=${branch}`).then(r=>r.json());
  const base64 = btoa(JSON.stringify(recipes, null, 2));
  await fetch(url, {
    method: 'PUT',
    headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Actualización recetas',
      content: base64,
      sha: currentFile.sha,
      branch
    })
  });
  fetchRecipes();
}

// Render
function renderRecipes() {
  const container = document.getElementById('recipes-container');
  container.innerHTML = '';
  recipes.forEach((r,i)=>{
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${r.imagen}" alt="${r.nombre}">
      <h3>${r.nombre}</h3>
      <p>Temp: ${r.temperatura} | Tiempo: ${r.tiempo}</p>
      <p><strong>Ingredientes:</strong> ${r.ingredientes}</p>
      <p><strong>Preparación:</strong> ${r.preparacion}</p>
      ${r.video ? `<a href="${r.video}" target="_blank">Ver Video</a>` : ''}
      <button class="edit">Editar</button>
      <button class="delete">Borrar</button>
    `;
    card.querySelector('.edit').onclick = ()=>openModal(i);
    card.querySelector('.delete').onclick = ()=>deleteRecipe(i);
    container.appendChild(card);
  });
}

// Modal open
function openModal(index=null) {
  editingIndex = index;
  modal.style.display = 'block';
  form.reset();
  previewImg.style.display = 'none';

  if(index !== null) {
    const r = recipes[index];
    document.getElementById('nombre').value = r.nombre;
    document.getElementById('temperatura').value = r.temperatura;
    document.getElementById('tiempo').value = r.tiempo;
    document.getElementById('ingredientes').value = r.ingredientes;
    document.getElementById('preparacion').value = r.preparacion;
    document.getElementById('imagen').value = r.imagen;
    if(r.imagen) {
      previewImg.src = r.imagen;
      previewImg.style.display = 'block';
    }
    document.getElementById('video').value = r.video;
    document.getElementById('modal-title').innerText = 'Editar Receta';
  } else {
    document.getElementById('modal-title').innerText = 'Nueva Receta';
  }
}

// Guardar receta
form.onsubmit = async (e)=>{
  e.preventDefault();
  const newRecipe = {
    nombre: document.getElementById('nombre').value,
    temperatura: document.getElementById('temperatura').value,
    tiempo: document.getElementById('tiempo').value,
    ingredientes: document.getElementById('ingredientes').value,
    preparacion: document.getElementById('preparacion').value,
    imagen: document.getElementById('imagen').value,
    video: document.getElementById('video').value
  };
  if(editingIndex !== null) recipes[editingIndex] = newRecipe;
  else recipes.push(newRecipe);

  await saveRecipesToGitHub();
  modal.style.display = 'none';
}

// Borrar receta
async function deleteRecipe(index) {
  if(!confirm('¿Seguro que quieres borrar esta receta?')) return;
  recipes.splice(index,1);
  await saveRecipesToGitHub();
}

// Inicializar
fetchRecipes();
