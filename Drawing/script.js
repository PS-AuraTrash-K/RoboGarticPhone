const canvas = document.getElementById("drawingCanvas");
const ctx = canvas.getContext("2d");
const colorPicker = document.getElementById("colorPicker");
const brushSize = document.getElementById("brushSize");
const sizeVal = document.getElementById("sizeVal");

let drawing = false;
let currentTool = "brush";
let startX, startY, snapshot;

// Історія для Undo/Redo
let undoStack = [];
let redoStack = [];

function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    saveState(); // Зберігаємо початкове біле полотно
}
window.addEventListener("resize", resize);
resize();

brushSize.oninput = () => sizeVal.innerText = brushSize.value;

// --- Undo / Redo Логіка ---
function saveState() {
    undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (undoStack.length > 20) undoStack.shift(); // Ліміт кроків
    redoStack = []; // Очищуємо Redo при новій дії
}

window.undo = function() {
    if (undoStack.length > 1) {
        redoStack.push(undoStack.pop());
        ctx.putImageData(undoStack[undoStack.length - 1], 0, 0);
    }
};

window.redo = function() {
    if (redoStack.length > 0) {
        let state = redoStack.pop();
        undoStack.push(state);
        ctx.putImageData(state, 0, 0);
    }
};

// --- Інструменти ---
window.setTool = function(tool, el) {
    currentTool = tool;
    document.querySelectorAll('.tool-grid button').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
};

function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

// --- Алгоритм Заливки (Flood Fill) ---
function floodFill(startX, startY, fillColor) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const targetColor = getPixelColor(data, startX, startY);
    const fillRGB = hexToRgb(fillColor);

    if (colorsMatch(targetColor, fillRGB)) return;

    const pixelsToCheck = [startX, startY];
    while (pixelsToCheck.length > 0) {
        const y = pixelsToCheck.pop();
        const x = pixelsToCheck.pop();

        const currentIndex = (y * canvas.width + x) * 4;
        if (colorsMatch(getPixelColor(data, x, y), targetColor)) {
            setPixelColor(data, currentIndex, fillRGB);
            
            if (x > 0) pixelsToCheck.push(x - 1, y);
            if (x < canvas.width - 1) pixelsToCheck.push(x + 1, y);
            if (y > 0) pixelsToCheck.push(x, y - 1);
            if (y < canvas.height - 1) pixelsToCheck.push(x, y + 1);
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

function getPixelColor(data, x, y) {
    const i = (y * canvas.width + x) * 4;
    return [data[i], data[i+1], data[i+2]];
}

function setPixelColor(data, i, rgb) {
    data[i] = rgb.r; data[i+1] = rgb.g; data[i+2] = rgb.b; data[i+3] = 255;
}

function colorsMatch(c1, c2) {
    return c1[0] === c2.r && c1[1] === c2.g && c1[2] === c2.b;
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
}

// --- Події миші ---
canvas.addEventListener("mousedown", (e) => {
    const pos = getPos(e);
    
    if (currentTool === 'fill') {
        floodFill(Math.floor(pos.x), Math.floor(pos.y), colorPicker.value);
        saveState();
        return;
    }

    drawing = true;
    startX = pos.x;
    startY = pos.y;
    ctx.lineWidth = brushSize.value;
    ctx.strokeStyle = colorPicker.value;
    ctx.lineCap = "round";
    snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    if (currentTool === 'brush') {
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    }
});

canvas.addEventListener("mousemove", (e) => {
    if (!drawing) return;
    const pos = getPos(e);

    if (currentTool === 'brush') {
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    } else if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
    } else if (currentTool === 'rect') {
        ctx.putImageData(snapshot, 0, 0);
        ctx.strokeRect(startX, startY, pos.x - startX, pos.y - startY);
    } else if (currentTool === 'line') {
        ctx.putImageData(snapshot, 0, 0);
        ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(pos.x, pos.y); ctx.stroke();
    } else if (currentTool === 'circle') {
        ctx.putImageData(snapshot, 0, 0);
        ctx.beginPath();
        let r = Math.sqrt(Math.pow(pos.x - startX, 2) + Math.pow(pos.y - startY, 2));
        ctx.arc(startX, startY, r, 0, 2 * Math.PI);
        ctx.stroke();
    }
});

canvas.addEventListener("mouseup", () => {
    if (drawing) saveState();
    drawing = false;
    ctx.beginPath();
});

window.clearCanvas = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveState();
};