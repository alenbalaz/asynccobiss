const google = require("googleapis");
var OAuth2 = google.auth.OAuth2;
const dateTime = require("node-datetime");
var GAPI = {};

//Spremenljivke za Google Auth in Google API-je

var oauth2Client = new OAuth2("553201886409-6o4sv0vad0qjvqps4t2mjp0otsvs9s5b.apps.googleusercontent.com","cA9QScF5vMiD0VfsG4vfzUP7","urn:ietf:wg:oauth:2.0:oob");
oauth2Client.setCredentials({
	access_token: 'ya29.GltZBbJdEDjlkLgYjK5oefen4_v3MraQUvR9wRYn7s3mY8ZgBviagHLnGbbee18q4JReFDJkU20_WhpXtetjo65Wq070ry_SR71q7ExQ6A2XILb5He1RjP60A3Hh',
	refresh_token: '1/rwRPIffjZ60km6pezdeUczAVWzXCBPUin7rwGoGBLaQ'
});
const drive = google.drive({
	version: "v3",
	auth: oauth2Client
});
const sheets = google.sheets({
	version: "v4",
	auth: oauth2Client
});

//Funkcije za Google Sheets + Drive

GAPI.getData = function(){
	return new Promise(function(res,rej){
		var request = {
			spreadsheetId: '13GWqTNSNubDRbL6IKc624mb-i0JFEm0JVAK-ofn6t_I',
			ranges: [
				'Publikacije!B4:B',
				'Publikacije!AG4:AG',
				'Publikacije!AH4:AH',
				'Publikacije!BP4:BP',
				'Publikacije!CD4:CD',
				'Publikacije!AB4:AB',
				'Publikacije!DB4:DB',
				'Publikacije!DQ4:DQ',
				'Publikacije!DR4:DR'
			]
		};
		sheets.spreadsheets.values.batchGet(request,function(err,response){
			if(err){
				rej("Napaka: "+err);
			}else{
				const meja = response.data.valueRanges[0].values.length;
				response.data.valueRanges.forEach(function(el){
					if(!(el.values)){
						el.values = [];
					}
					while(el.values.length < meja){
						el.values.push([]);
					}
				});
				res(response);
			}
		});
	});
};
GAPI.createSpreadsheet = function(logdata,cobissdata){
	return new Promise(function(res,rej){
		var fileMetadata = {
			name: "COBISS_ID_Poizvedbe_"+dateTime.create().format("Y_m_d-H_M_S"),
			parents: ["1XQGQgWgLW-Cyn4P0EN6-JoC6bhAWpHjJ"],
			mimeType: "application/vnd.google-apps.spreadsheet"
		};
		drive.files.create({
			resource: fileMetadata,
			fields: "id"
		},function(err,file){
			if(err){
				rej("Napaka pri ustvarjanju datoteke: "+err);
			}else{
				const fid = file.data.id;
				var addSheetsRequest = {
					spreadsheetId: fid,
					resource: {
						requests: [
							{
								addSheet: {
									properties: {
										title: "Log"
									}
								}
							},
							{
								addSheet: {
									properties: {
										title: "Data"
									}
								}
							},
							{
								deleteSheet: {
									sheetId: 0
								}
							}
						]
					}
				};
				sheets.spreadsheets.batchUpdate(addSheetsRequest,function(err,response){
					if(err){
						rej("Napaka pri urejanju sheet-ov v spreadsheet-u: "+err);
					}else{
						logdata.unshift(["ID_Poizvedbe","ID_Publikacije","Nacin","ISBN/ISMN/ISSN","Avtor","Naslov","Leto","St_zadetkov","Vrstica_zadetka"]);
						cobissdata.unshift(["ID_Poizvedbe","ID_Zadetka","ISBN","Avtor","Drugi avtorji","Naslov","Leto","Jezik","Vrsta gradiva","UDK","Predmetne oznake","Nekontrolirane predmetne oznake","COBISS-ID","Timestamp"]);
						var burequest = {
							spreadsheetId: fid,
							resource: {
								valueInputOption: "RAW",
								data: [
									{
										range: "Log!A1:I"+logdata.length,
										values: logdata
									},
									{
										range: "Data!A1:N"+cobissdata.length,
										values: cobissdata
									}
								]
							}
						};
						sheets.spreadsheets.values.batchUpdate(burequest,function(err,response){
							if(err){
								rej("Napaka pri vstavljanju podatkov v spreadsheet: "+err);
							}else{
								var bss_request = {													//Brisanje source spreadsheet request 
									spreadsheetId: '1DcelEMfpibP0pEjjDPfDim04OITm6HKC-QKWoY7B70Y',
									resource: {
										ranges: [
											'Log!A1:I'+logdata.length,
											'Data!A1:N'+cobissdata.length
										]
									}
								};
								sheets.spreadsheets.values.batchClear(bss_request,function(err,response){
									if(err){
										rej("Napaka pri brisanju prejšnjih podatkov iz source file: "+err);
									}else{
										wss_request = {
											spreadsheetId: '1DcelEMfpibP0pEjjDPfDim04OITm6HKC-QKWoY7B70Y',
											resource: {
												valueInputOption: "RAW",
												data: [
													{
														range: "Log!A1:I"+logdata.length,
														values: logdata
													},
													{
														range: "Data!A1:N"+cobissdata.length,
														values: cobissdata
													}
												]
											}
										};
										sheets.spreadsheets.values.batchUpdate(wss_request,function(err,response){
											if(err){
												rej("Napaka pri vstavljanju podatkov v source spreadsheet: "+err);
											}else{
												res("Uspešno zapisal vse podatke v arhiv in source datoteko!");
											}
										});
									}
								});
							}
						});
					}
				});
			}
		});
	});
};

exports = module.exports = GAPI;