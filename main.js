const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const targetFormat = document.getElementById('targetFormat');
const qualitySlider = document.getElementById('qualitySlider');
const qualityVal = document.getElementById('qualityVal');
const qualityGroup = document.getElementById('qualityGroup');
const convertBtn = document.getElementById('convertBtn');
const fileList = document.getElementById('fileList');
const batchActions = document.getElementById('batchActions');
const downloadZipBtn = document.getElementById('downloadZipBtn');

let selectedFiles = [];
let convertedBlobs = [];

// Kalite kaydırıcısı ve PNG uyarısı (PNG kayıpsız olduğu için kalite ayarı kullanmaz)
qualitySlider.addEventListener('input', () => {
    qualityVal.textContent = `${qualitySlider.value}%`;
});

targetFormat.addEventListener('change', () => {
    qualityGroup.style.opacity = targetFormat.value === 'image/png' ? '0.4' : '1';
});

// Sürükle - Bırak olayları
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

function handleFiles(files) {
    selectedFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    convertedBlobs = [];
    batchActions.classList.add('hidden');
    fileList.innerHTML = '';

    selectedFiles.forEach((file, index) => {
        const li = document.createElement('li');
        li.className = 'file-item';
        li.id = `item-${index}`;
        li.innerHTML = `
            <div class="file-info">
                <span class="file-name">${file.name}</span>
                <span class="file-meta">${(file.size / 1024).toFixed(1)} KB • Ready</span>
            </div>
            <span class="file-status" style="color:#94a3b8;">Waiting</span>
        `;
        fileList.appendChild(li);
    });

    convertBtn.disabled = selectedFiles.length === 0;
}

// Dönüştürme İşlemi
convertBtn.addEventListener('click', async () => {
    convertBtn.disabled = true;
    convertedBlobs = [];
    const format = targetFormat.value;
    const quality = parseInt(qualitySlider.value) / 100;
    const ext = format.split('/')[1].replace('jpeg', 'jpg');

    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const itemEl = document.getElementById(`item-${i}`);
        const statusEl = itemEl.querySelector('.file-status');
        statusEl.textContent = 'Converting...';

        try {
            const blob = await convertSingleImage(file, format, quality);
            const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || 'image';
            const newName = `${baseName}.${ext}`;
            const url = URL.createObjectURL(blob);

            convertedBlobs.push({ name: newName, blob });

            itemEl.querySelector('.file-meta').textContent = `${(blob.size / 1024).toFixed(1)} KB • Converted to .${ext.toUpperCase()}`;
            statusEl.outerHTML = `<a href="${url}" download="${newName}" class="download-link">Download .${ext}</a>`;
        } catch (err) {
            statusEl.textContent = 'Error';
            statusEl.style.color = '#ef4444';
        }
    }

    if (convertedBlobs.length > 1) {
        batchActions.classList.remove('hidden');
    }
    convertBtn.disabled = false;
});

function convertSingleImage(file, format, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');

                if (format === 'image/jpeg') {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }

                ctx.drawImage(img, 0, 0);
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Conversion failed'));
                }, format, quality);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Toplu ZIP İndirme
downloadZipBtn.addEventListener('click', async () => {
    const zip = new JSZip();
    convertedBlobs.forEach(item => {
        zip.file(item.name, item.blob);
    });
    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = 'converted_images.zip';
    link.click();
});
