const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const port = 3000;

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
            headless: true,
            args: ['--disable-web-security', '--no-sandbox']
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        
        console.log('Navegando a la página...');
        await page.goto('https://cotransagroup.com/container-tracking/', { waitUntil: 'networkidle2', timeout: 60000 });

        console.log('Aceptando cookies...');
        await page.waitForSelector('#cookie21AlertAcceptAll', { visible: true, timeout: 10000 });
        await page.click('#cookie21AlertAcceptAll');

        // Esperar a que el shadow DOM esté disponible
        await page.waitForFunction(() => {
            const shadowRoot = document.querySelector("#tracking_system_root")?.shadowRoot;
            return shadowRoot && shadowRoot.querySelector("#app-root > div.jNVSgr > div.VvPpX6 > div");
        });

        // Extraer el HTML del primer elemento
        const element1 = await page.evaluateHandle(() => {
            return document.querySelector("#tracking_system_root").shadowRoot.querySelector("#app-root > div.jNVSgr > div.VvPpX6 > div");
        });
        const html1 = await page.evaluate(element => element.outerHTML, element1);

        // Capturar la imagen del segundo elemento
        const element2 = await page.evaluateHandle(() => {
            return document.querySelector("#tracking_system_root").shadowRoot.querySelector("#app-root > div.jNVSgr > div.J_fGwb > div > div");
        });
        await element2.screenshot({ path: 'data/element2.png' });

        await browser.close();
        console.log('Navegador cerrado, enviando JSON y captura de imagen...');

        // Enviar el HTML como JSON y confirmación de captura
        res.json({ html1, message: 'Captura de imagen guardada en data/element2.png' });
    } catch (error) {
        console.error('Error al extraer el HTML o capturar la imagen:', error);
        res.status(500).json({ error: 'Error al extraer el HTML o capturar la imagen' });
    }
});

app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
