const GAPI = require("./gapis.js");
const funkcije = require("./funkcije.js");
const cluster = require("cluster");

if(cluster.isMaster){
	const worker = cluster.fork();
	worker.on("exit",function(code,signal){
		console.log("Izvajanje se je dokončalo!");
	});
}else if(cluster.isWorker){
	GAPI.getData().then(function(neurejeno){
		const inputdata = funkcije.fixInputData(neurejeno);
		var search_urls = [];
		for(var i=0;i<inputdata.length;i++){
			search_urls.push(funkcije.getURLInputString(inputdata[i]));
		}
		var link_promises = [];
		for(var i=0;i<search_urls.length;i++){
			link_promises.push(funkcije.getLinkPromise(search_urls[i]));
		}
		Promise.all(link_promises).then(function(links){
			funkcije.getDataPromise(links).then(function(cobissdata){
				const logdata = funkcije.createLogData(inputdata,links);
				GAPI.createSpreadsheet(logdata,cobissdata).then(function(odg){
					console.log(odg);
					cluster.worker.kill();
				}).catch(function(err){
					console.log(err);
					cluster.worker.kill();
				});
			}).catch(function(error){
				console.log(error);
				cluster.worker.kill();
			});
		}).catch(function(error){
			console.log(error);
			cluster.worker.kill();
		});
	}).catch(function(error){
		console.log(error);
		cluster.worker.kill();
	});
}