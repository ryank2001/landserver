const express = require('express');
const fs = require('fs');
const https = require('https');
const validator = require('validator');
const messages = require('../messages.json');
var http = require('http');
const { response } = require('express');
const allowedApiCalls = [ 'balance', 'withdraw' ];
const r = messages.noob;
const wysd = messages.wysd;
const app = express();
app.use(express.json());

// HTTPS server options
// Note that rejectUnauth is false in order to politely respond to invalid certs
const opts = {
    key: fs.readFileSync("country_key.pem"),
    cert: fs.readFileSync("cer2.cer"),
    requestCert: false,
    rejectUnauthorized: false,
    ca: [fs.readFileSync("noob_root2.cer"),
	fs.readFileSync("noob_countrys_Cer.cer")
	]
};

port = 8334

routingtable ={
    ODUO : "145.24.222.225",
    BAOV : "145.24.222.179"
  }
  noobIP = ""



/**
* function writeLogs(message)
* Function for cleaner logging to stdout and mysql database
*
* message:	Log/error message string
* ---
* TODO: add extra (internal) logfile with more info (like IP addresses)
*/
function writeLogs(message) {
    console.log(message)
}

/**
* async function sendRequest(dstIP, sendObj, apiMethod, _callback)
* Initiates HTTPS request to target country after receiving a request from source country.
* Async function with max timeout of 3 seconds. Assumes that everyone uses port 8443.
*
* dstIP:	IP address of the target country.
* sendObj:	The request object that is to be passed on to the target country.
* apiMethod:	The API method to call on the target server. Equals the method called by source country.
* httpMethod: 	Which HTTP method is to be used. POST or GET probably.
* _callback:	Callback function to be executed when the response from the target country is received.
*/
async function sendRequest( sendObj, apiMethod, _callback) {
    const apiMethodStr = '/api/'.concat(apiMethod);
    const https_options = {
	host:	 	"145.24.222.82",
	port: 		port,
	path: 		apiMethodStr,
	method:		"POST",
    headers:        { 'Content-Type': 'application/json' },
    cert: 		opts.cert,
	key:        opts.key,
    rejectUnauthorized: false,
	timeout: 	3000
    };

    try {
        const req = await https.request(https_options, (res) => {
	    res.setEncoding('utf8');
	    res.on('data', (obj) => {
		try {
			console.log(obj)
		    const responseObj = JSON.parse(obj);
            console.log(responseObj)
		    const resFromBank = responseObj.head.fromBank;
		    const resToBank = sendObj.head.fromBank;
		    writeLogs("Response from [" + resFromBank + "]. Forwarding to [" + resToBank + "]");
		    _callback(true, res.statusCode, responseObj);
		}
		catch(e) {
		    writeLogs(r.jsonParseError.message + e.message);
                    _callback(false, r.jsonParseError.code, r.jsonParseError.message + wysd.seeLogs);
		}
	    });
	});
	req.on('socket', function (socket) {
    	    socket.setTimeout(https_options.timeout);
    	    socket.on('timeout', function() {
        	writeLogs(r.timeoutError.message);
		req.destroy();
		_callback(false, r.timeoutError.code, r.timeoutError.message);
    	    });
	});
	req.on('error', (e) => {
	    writeLogs(e);
		req.destroy();
	    _callback(false, r.requestCompileError.code, r.requestCompileError.message + wysd.seeLogs);
	});
	req.write(JSON.stringify(sendObj));
	req.end();
    } catch(e) {
	writeLogs(r.sendRequestError.message + e.message);
	_callback(false, r.sendRequestTLDR.code, r.sendRequestTLDR.message + wysd.blame);
    }
}



async function sendRequestHTTP(dstIP, sendObj, apiMethod, httpMethod, _callback) {
    const apiMethodStr = '/'.concat(apiMethod);
    console.log(dstIP)
    const https_options = {
        host:	 	dstIP,
        port: 		81,
        path: 		apiMethodStr,
        method:		httpMethod,
        headers:        { 'Content-Type': 'application/json' },
        cert: 		opts.cert,
	key:            opts.key,
        rejectUnauthorized: false,
	timeout: 	3000
    };

    try {
        const req = await http.request(https_options, (res) => {
	    res.setEncoding('utf8');
	    res.on('data', (obj) => {
		try {
            
		    const responseObj = JSON.parse(obj);
            console.log(responseObj)
		    const resFromBank = responseObj.head.fromBank;
		    const resToBank = sendObj.head.fromBank;
		    writeLogs("Response from [" + resFromBank + "]. Forwarding to [" + resToBank + "]");
		    _callback(true, res.statusCode, responseObj);
		}
		catch(e) {
		    writeLogs(r.jsonParseError.message + e.message);
                    _callback(false, r.jsonParseError.code, r.jsonParseError.message + wysd.seeLogs);
		}
	    });
	});
	req.on('socket', function (socket) {
    	    socket.setTimeout(https_options.timeout);
    	    socket.on('timeout', function() {
        	writeLogs(r.timeoutError.message);
		req.destroy();
		_callback(false, r.timeoutError.code, r.timeoutError.message);
    	    });
	});
	req.on('error', (e) => {
	    writeLogs(e);
		req.destroy();
	    _callback(false, r.requestCompileError.code, r.requestCompileError.message + wysd.seeLogs);
	});
	req.write(JSON.stringify(sendObj));
	req.end();
    } catch(e) {
	writeLogs(r.sendRequestError.message + e.message);
	_callback(false, r.sendRequestTLDR.code, r.sendRequestTLDR.message + wysd.blame);
    }
}

// Test method (no certificate required)
app.get('/test', (req, res) => {
    res.status(r.noobTest.code).send(r.noobTest.message);
})

// TODO:
//  /register: Automatic registration on first API call with valid certificate

//register endpoint
//app.get('/register', (req, res) => {
//
//})

//Handles all allowed API calls
//POST only. Use of app.all() would have been less safe imo.
app.post('/api/:requestType', async (req, res) => {
    const methodCalled = req.params.requestType
    const fromBank = req.body.head.fromBank;
    const toBank = req.body.head.toBank;
    const toCtry = req.body.head.toCtry;

    if (!allowedApiCalls.includes(methodCalled.toLowerCase())) {
	writeLogs("[NOOB]: " + methodCalled + " is not an allowed API call." + wysd.rtfm)
	res.status(501).send("[NOOB]: " + methodCalled + " is not an allowed API call." + wysd.rtfm);
	return;
    }

    writeLogs("Incoming " + methodCalled + " request");

    if (req.client.authorized || true) {
        if (!req.is("application/json")){
	    writeLogs(r.expectedJSONError.message + wysd.sanityCheck)
            res.status(r.expectedJSONError.code).send(r.expectedJSONError.message + wysd.sanityCheck);
            return;
        }
        writeLogs("Request from [" + fromBank + "] going to [" + toBank + "]");
	    const dstIP = routingtable[toBank];
        if(dstIP === undefined){
            try {
                const obj = await sendRequest( req.body,  methodCalled, function(success, code, result) {
				const response = success ? result : result;
                res.status(code).send(response);
             });
                } catch(e) {
            writeLogs(r.awaitError.message + e.message);
            res.status(r.somethingHappened.code).send(r.somethingHappened.message + wysd.seeLogs);
            }
        } else {
	    try {
	        const obj = await sendRequestHTTP(dstIP, req.body, methodCalled, 'POST', function(success, code, result) {
            
		    const response = success ? result : result;
		    res.status(code).send(response);
	 	});
    	    } catch(e) {
		writeLogs(r.awaitError.message + e.message);
		res.status(r.somethingHappened.code).send(r.somethingHappened.message + wysd.seeLogs);
	    }
        }
    } else {
	writeLogs(r.invalidCertIssuer.message + req.socket.getPeerCertificate().issuer);
        res.status(r.unauthorized.code).send(r.unauthorized.message + wysd.seeLogs);
    }
});

http.createServer(app).listen(81);
https.createServer(opts, app).listen(port);
