// public/js/main.js 
// public/js/main.js

const canvas = document.getElementById('fractalCanvas');
const ctx = canvas.getContext('2d');
const renderButton = document.getElementById('renderButton');
const loadingMessage = document.getElementById('loadingMessage');

// Set canvas dimensions (responsive)
function setCanvasSize() {
    const containerWidth = canvas.parentElement.clientWidth;
    const aspectRatio = 4 / 3; // Example aspect ratio
    canvas.width = Math.min(800, containerWidth - 40); // Max 800px, or container width minus padding
    canvas.height = canvas.width / aspectRatio;
}

// Initial size setup
setCanvasSize();
// Recalculate size on window resize
window.addEventListener('resize', setCanvasSize);

// This `Module` object is provided by the Emscripten-generated `mandelbrot.js`
// It will contain the WASM instance and exported C++ functions.
// We'll define a placeholder here, but the actual one comes from the generated JS.
let Module = {
    onRuntimeInitialized: function() {
        console.log("WebAssembly module initialized.");
        loadingMessage.classList.add('hidden');
        renderButton.disabled = false; // Enable button once Wasm is ready
    },
    // You might define other properties like `locateFile` here
    // to tell Emscripten where to find the .wasm file if it's not in the same directory.
    locateFile: function(path, prefix) {
        if (path.endsWith(".wasm")) {
            return "js/" + path; // Assuming mandelbrot.wasm is in the same 'js' directory
        }
        return prefix + path;
    }
};

renderButton.addEventListener('click', () => {
    if (!Module || !Module._calculate_mandelbrot || !Module.HEAP32) {
        console.error("WebAssembly module not loaded or C++ function/memory not available.");
        loadingMessage.textContent = "Error: WebAssembly not loaded. Check console.";
        loadingMessage.classList.remove('hidden');
        return;
    }

    const width = canvas.width;
    const height = canvas.height;
    const maxIterations = 200; // Number of iterations for Mandelbrot calculation

    // Mandelbrot set coordinates
    const xMin = -2.0;
    const xMax = 1.0;
    const yMin = -1.5;
    const yMax = 1.5;

    // Allocate memory in WebAssembly for the pixel data (an array of integers)
    // Module._malloc is provided by Emscripten
    const bufferSize = width * height * Int32Array.BYTES_PER_ELEMENT; // Size in bytes
    const bufferPtr = Module._malloc(bufferSize);

    try {
        // Call the C++ function to calculate the fractal
        // Module._calculate_mandelbrot is the C++ function exported by Emscripten
        Module._calculate_mandelbrot(width, height, bufferPtr, xMin, yMin, xMax, yMax, maxIterations);

        // Get a view of the WebAssembly memory where the data is stored
        // Module.HEAP32 is a typed array view into the WebAssembly memory
        const fractalData = new Int32Array(Module.HEAP32.buffer, bufferPtr, width * height);

        // Create an ImageData object to draw on the canvas
        const imageData = ctx.createImageData(width, height);
        const pixels = imageData.data; // This is a Uint8ClampedArray

        // Map iteration counts to colors
        for (let i = 0; i < width * height; ++i) {
            const iterations = fractalData[i];
            const pixelIndex = i * 4; // Each pixel has R, G, B, A components

            if (iterations === maxIterations) {
                // Point is likely in the Mandelbrot set (black)
                pixels[pixelIndex] = 0;     // R
                pixels[pixelIndex + 1] = 0; // G
                pixels[pixelIndex + 2] = 0; // B
                pixels[pixelIndex + 3] = 255; // A (opaque)
            } else {
                // Point is outside, color based on iteration count
                // Simple color mapping: adjust for more vibrant colors
                const hue = (iterations % 255); // Use hue for color variation
                pixels[pixelIndex] = hue;       // R
                pixels[pixelIndex + 1] = 255 - hue; // G
                pixels[pixelIndex + 2] = (hue + 128) % 255; // B
                pixels[pixelIndex + 3] = 255; // A (opaque)
            }
        }

        // Put the image data onto the canvas
        ctx.putImageData(imageData, 0, 0);

    } catch (e) {
        console.error("Error rendering fractal:", e);
        loadingMessage.textContent = `Error: ${e.message}`;
        loadingMessage.classList.remove('hidden');
    } finally {
        // Free the allocated memory in WebAssembly (important for performance)
        // Module._free is provided by Emscripten
        Module._free(bufferPtr);
    }
});

renderButton.disabled = true;
loadingMessage.classList.remove('hidden');
