import { MongoClient } from "mongodb";
import { Server } from "socket.io";
import express from "express"

const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri);
const database = client.db("inercial");

const app = express();
const port = 8082;
const server = app.listen(`${port}`, '0.0.0.0', function () {
    console.log(`Server started on port ${port}`);
});

const io = new Server(server, {
    cors: {
        origin: '*',
    }
});

io.on("connection", socket => {
    let interval_id;
    let ejecuciones = 0;

    socket.on('disconnect', function () {
        console.log('Socket desconectado');
        clearInterval(interval_id);
    });


    socket.on('realtime', (data) => {
        let last_tm = 0;
        interval_id = setInterval(async () => {
            if (ejecuciones >= 100) {
                clearInterval(interval_id);
                console.log('Intervalo terminado después de 1000 ejecuciones.');
                return;
            }
            
            try {
                ejecuciones++;

                console.time('consulta');
                let docs = await getLastNLecturas(2000, data.node);
                console.timeEnd('consulta');
                
                if (docs.length === 0) {
                    console.log('No hay datos')
                    return;
                }

                if(ejecuciones == 1){
                    console.log('Primera ejecución');
                    last_tm = docs[0].tm;
                    return;
                }

                docs = sliceDocsToGetOnlyNewData(docs, last_tm);
                
                if (docs.length === 0) {
                    console.log('No hay datos nuevos')
                    return;
                }

                last_tm = docs[0].tm;
                socket.emit('realtime', docs);

            } catch (err) {
                console.log(err);
            }
        }, 1000) // cada 1 segundo
    });
});

// funciones para hacer unit testing

async function getLastNLecturas(n, node){
    return await database.collection(`lecturas${node}`).find().sort({"_id":-1}).limit(n).toArray();
}

function sliceDocsToGetOnlyNewData(docs, last_tm) {
    let index = docs.findIndex((element) => element.tm == last_tm);
    if (index > -1) {
        return docs.slice(0, index);
    }
    return docs;
}
