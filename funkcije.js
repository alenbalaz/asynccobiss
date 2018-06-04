const urlencode = require("urlencode");
const request = require("request");
const cheerio = require("cheerio");
const vo = require("vo");
const prenightmare = require("nightmare");
const nightmare = prenightmare({show: false});
const dateTime = require("node-datetime");
var funkcije = {};

//Funkcije, ki se uporabljajo samo znotraj tega file-a

function hasNumbers(input){
	return /\d/.test(input);
};

//request + nigthmare funkcije

funkcije.getLinkPromise = function(input_url){
	return new Promise(function(res,rej){
		setTimeout(function(){
			var options = {
				url: input_url,
				headers: {
					"User-Agent": "BrowserlessScraper"
				}
			};
			request(options,function(err,response,html){
				if(err){
					rej(err);
				}else{
					var $ = cheerio.load(html);
					var elementi = $("tr.odd.biblioentry");
					var koncno = [];
					for(var i=0;i<elementi.length;i++){
						koncno.push(elementi[i].attribs['data-href']);
					}
					res(koncno);
				}
			});
		},Math.floor(Math.random()*(60000-1000+1)+1000));
	});
};
funkcije.getDataPromise = function(links){
	return new Promise(function(res,rej){
		setTimeout(function(){
			var browser = function *(input){
				var partialdata;
				var data = [];
				for(var i=0;i<input.length;i++){
					if(input[i].length > 0){
						for(var j=0;j<input[i].length;j++){
							partialdata = yield nightmare.goto("https://plus.si.cobiss.net/opac7/"+input[i][j])
							.wait('body')
							.click('li#full-details-nav-tab a')
							.wait('td.attribute-label')
							.evaluate(function(i,j,cas){
								var labele = document.getElementsByClassName("attribute-label");
								var vrednosti = document.getElementsByClassName("attribute-value");
								var partial = [i+1,j+1,"","","","","","","","","","","",cas];
								for(var it=0;it<labele.length;it++){
									if(labele[it].innerText.indexOf("ISBN") !== -1){
										partial[2] = vrednosti[it].innerText.replace(/(\n)/gm,"; ");
									}else if(labele[it].innerText.indexOf("Avtor") !== -1){
										partial[3] = vrednosti[it].innerText.replace(/(\n)/gm,"; ");
									}else if(labele[it].innerText.indexOf("Drugi avtorji") !== -1){
										partial[4] = vrednosti[it].innerText.replace(/(\n)/gm,"; ");
									}else if(labele[it].innerText.indexOf("Naslov") !== -1){
										partial[5] = vrednosti[it].innerText.replace(/(\n)/gm,"; ");
									}else if(labele[it].innerText.indexOf("Leto") !== -1){
										partial[6] = vrednosti[it].innerText.replace(/(\n)/gm,"; ");
									}else if(labele[it].innerText.indexOf("Jezik") !== -1){
										partial[7] = vrednosti[it].innerText.replace(/(\n)/gm,"; ");
									}else if(labele[it].innerText.indexOf("Vrsta gradiva") !== -1){
										partial[8] = vrednosti[it].innerText.replace(/(\n)/gm,"; ");
									}else if(labele[it].innerText.indexOf("UDK") !== -1){
										partial[9] = vrednosti[it].innerText.replace(/(\n)/gm,"; ");
									}else if(labele[it].innerText.indexOf("Predmetne oznake") !== -1){
										partial[10] = vrednosti[it].innerText.replace(/(\n)/gm,"; ");
									}else if(labele[it].innerText.indexOf("Nekontrolirane predmetne oznake") !== -1){
										partial[11] = vrednosti[it].innerText.replace(/(\n)/gm,"; ");
									}else if(labele[it].innerText.indexOf("COBISS-ID") !== -1){
										partial[12] = vrednosti[it].innerText.replace(/(\n)/gm,"; ");
									}else{
										continue;
									}
								}
								return partial;
							},i,j,dateTime.create().format("d.m.Y H:M:S"));
							data.push(partialdata);
						}
					}else{
						data.push([i+1,0,"","","","","","","","","","","",dateTime.create().format("d.m.Y H:M:S")]);
					}
					console.log((i+1)+" / "+input.length+" Dobil vse zadetke!");
				}
				return data;
			};
			vo(browser(links))(function(err,data){
				if(err){
					rej("Napaka: "+err);
				}else{
					res(data);
				}
			});
		},Math.floor(Math.random()*(2000-500+1)+1000));
	});
};

//Ostale funkcije

funkcije.fixInputData = function(vnos){
	var koncno = [];
	for(var i=0;i<vnos.data.valueRanges[0].values.length;i++){
		var pre = [];
		for(var j=0;j<vnos.data.valueRanges.length;j++){
			if(vnos.data.valueRanges[j].values[i][0]){
				pre.push(vnos.data.valueRanges[j].values[i][0]);
			}else{
				pre.push("");
			}
		}
		koncno.push(pre);
	}
	return koncno;
};
funkcije.getURLInputString = function(input){
	if(input[1] === "ISBN" && hasNumbers(input[2])){
		return "https://plus.si.cobiss.net/opac7/bib/search/advanced?bn="+input[2]+"&db=cobib&mat=allmaterials&max=25&sort=desc";
	}else if(input[1] === "ISMN"){
		return "https://plus.si.cobiss.net/opac7/bib/search?q="+urlencode(input[2]+" "+input[4].split(" [")[0])+"&db=cobib&mat=allmaterials&max=25&sort=desc";
	}else if(input[6] !== "" && hasNumbers(input[7])){
		return "https://plus.si.cobiss.net/opac7/bib/search/advanced?sx="+input[7]+"&db=cobib&mat=allmaterials&max=25&sort=desc";
	}else if(input[6] !== "" && hasNumbers(input[8])){
		return "https://plus.si.cobiss.net/opac7/bib/search/advanced?sx="+input[8]+"&db=cobib&mat=allmaterials&max=25&sort=desc";
	}else{
		return "https://plus.si.cobiss.net/opac7/bib/search/advanced?ax="+urlencode(input[3].split(",")[0].split(" [")[0])+"&ti="+urlencode(input[4].split(" [")[0])+"&py="+input[5]+"&db=cobib&mat=allmaterials&max=25&sort=desc";
	}
};
funkcije.createLogData = function(inputdata,links){
	var koncno = [];
	var zindex = 2;
	for(var i=0;i<links.length;i++){
		var partial = [i+1,inputdata[i][0],"","","","","",links[i].length,zindex];
		if(links[i].length === 0){
			zindex+=1;
			partial[8] = 0;
		}else{
			zindex+=links[i].length;
		}
		if(inputdata[i][1] === "ISBN" && hasNumbers(inputdata[i][2])){
			partial[2] = "ISBN";
			partial[3] = inputdata[i][2];
		}else if(inputdata[i][1] === "ISMN"){
			partial[2] = "Osnovno [ISMN+Naslov]";
			partial[3] = inputdata[i][2];
			partial[5] = inputdata[i][4].split(" [")[0];
		}else if(inputdata[i][6] !== "" && hasNumbers(inputdata[i][7])){
			partial[2] = "ISSN";
			partial[3] = inputdata[i][7];
		}else if(inputdata[i][6] !== "" && hasNumbers(inputdata[i][8])){
			partial[2] = "ISSNe";
			partial[3] = inputdata[i][8];
		}else{
			partial[2] = "Izbirno [Avtor + Naslov + Leto]";
			partial[4] = inputdata[i][3].split(",")[0].split(" [")[0];
			partial[5] = inputdata[i][4].split(" [")[0];
			partial[6] = inputdata[i][5];
		}
		koncno.push(partial);
	}
	return koncno;
};

exports = module.exports = funkcije;