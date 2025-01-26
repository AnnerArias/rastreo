const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');

const app = express();
const port = 3000;

// Middleware para ignorar solicitudes de favicon.ico
app.use((req, res, next) => {
    if (req.originalUrl === '/favicon.ico') {
        res.status(204).end();
    } else {
        next();
    }
});

app.get('/:value', async (req, res) => {
    const value = req.params.value;

    try {
        const browser = await puppeteer.launch({ 
            slowMo: 200,
            // headless: false,
            args: ['--disable-web-security', '--no-sandbox']
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        console.log('Navegando a la página...');
        await page.goto('https://cotransagroup.com/container-tracking/', { waitUntil: 'networkidle2', timeout: 60000 });

        console.log('Aceptando cookies...');
        await page.waitForSelector('#cookie21AlertAcceptAll', { visible: true, timeout: 10000 });
        await page.click('#cookie21AlertAcceptAll');

        console.log('Esperando el iframe...');
        await page.waitForSelector('#container-tracking-wrapper iframe', { visible: true, timeout: 60000 });
        const iframeElement = await page.$('#container-tracking-wrapper iframe');
        const iframe = await iframeElement.contentFrame();

        console.log('Esperando el selector dentro del iframe...');
        await iframe.waitForSelector('#tracking_system_root', { visible: true, timeout: 60000 });
        const trackingRootElement = await iframe.evaluateHandle(() => document.querySelector('#tracking_system_root').shadowRoot);

        if (trackingRootElement) {
            console.log('Accediendo al shadow DOM...');
            // Usa el contexto del shadowRoot para ubicar el elemento deseado
            const elementToCapture = await trackingRootElement.evaluateHandle(root => 
                root.querySelector("#app-root > div.jNVSgr > div.J_fGwb > div > div > div.leaflet-pane.leaflet-map-pane > div.leaflet-pane.leaflet-tile-pane > div")
            );

            console.log('Escribiendo el valor en el input y dando enter...');
            const inputHandle = await trackingRootElement.evaluateHandle(root => 
                root.querySelector('#app-root > div > div.VvPpX6 > div > div.r8H33s > div > div > input[type=text]')
            );
            await inputHandle.type(value);
            await inputHandle.press('Enter');

            // Pausa usando una promesa de espera en lugar de `waitForTimeout`
            await new Promise(resolve => setTimeout(resolve, 5000)); // Ajustar el tiempo según sea necesario

            console.log('Capturando imagen del elemento...');
            // Realiza el screenshot y lo guarda con el nombre basado en `value`
            const imagePath = path.join(__dirname, `${value}.png`);
            await elementToCapture.screenshot({ path: imagePath });
            console.log(`Imagen guardada como ${value}.png`);

            console.log('Extrayendo el HTML del elemento...');
            const html1 = await elementToCapture.evaluate(el => el.innerHTML);

            await browser.close();
            console.log('Navegador cerrado, enviando json...');
            // Enviar el HTML como JSON y confirmar que la imagen fue guardada
            res.json({ html1, screenshotPath: imagePath });
        } else {
            throw new Error('Elemento tracking_root no encontrado');
        }

    } catch (error) {
        console.error(error);
        res.status(500).send('Ocurrió un error');
    }
});

app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
