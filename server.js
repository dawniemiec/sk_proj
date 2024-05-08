const express = require('express');
const app = express();
const port = 3000;
const nodePortScanner = require('node-port-scanner');
const net = require('net');
app.use(express.urlencoded({ extended: true }));

app.listen(port, () => { console.log(`Server is running on port ${port}`); });

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.post('/scan', async (req, res) => {
    let rangeMin = req.body.rangeMin;
    let rangeMax = req.body.rangeMax;
    let chosenOption = req.body.option;
    if (rangeMin > rangeMax) {
        res.send({ error: 'Invalid range' });
        return;
    }
    if(rangeMin < 1 || rangeMax > 65535){
        res.send({ error: 'Invalid range' });
        return;
    }
    if (chosenOption != 'local' && chosenOption != 'rem') {
        res.send({ error: 'Invalid option' });
        return;
    }
    if(chosenOption == 'rem' && req.body.url == ''){
        res.send({ error: 'Invalid URL' });
        return;
    }
    if(rangeMax == null || rangeMin == null){
        res.send({ error: 'Invalid range' });
        return;
    }

    if (chosenOption == 'local') {
        console.log('Scanning locally');
        let result = await scanPortsLocally(rangeMin, rangeMax);
        res.send(result);

    } else if (chosenOption == 'rem') {
        console.log('Scanning remotely');
        let hostname = req.body.url;
        let result = await scanPortsRemotely(rangeMin, rangeMax, hostname);
        res.send(result);
    }

});

async function scanPortsLocally(rangeMin, rangeMax) {

    let results = { ports: { open: [], closed: [] } };
    const promises = [];

    for (let i = rangeMin; i <= rangeMax; i++) {

        const promise = new Promise((resolve, reject) => {

            let socket = new net.Socket();
            socket.setTimeout(200);

            socket._status = null;

            socket.on('connect', function () {
                console.log('Port open: ' + i);
                this._status = 'open';
                results.ports.open.push(i);
                socket.destroy();
                resolve();
            });

            socket.on('error', function () {
                console.log('Port closed: ' + i);
                this._status = 'closed';
                results.ports.closed.push(i);
                socket.destroy();
                resolve();
            });

            socket.connect(i, 'localhost');
        });
        promises.push(promise);

    }
    await Promise.all(promises);
    return results;
}

async function scanPortsRemotely(rangeMin, rangeMax, hostname) {
    const ports = [];
    for (let i = rangeMin; i <= rangeMax; i++) {
        ports.push(parseInt(i));
    }
    const promise = new Promise((resolve, reject) => {
    nodePortScanner(hostname, ports)
        .then(result => {
            console.log(result);
            resolve(result);
            
        }).catch(err => {
            console.error(err);
        });
    });
    await Promise.resolve(promise);
    return promise;
}

