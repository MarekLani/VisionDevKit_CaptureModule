'use strict';

var Transport = require('azure-iot-device-mqtt').Mqtt;
var Client = require('azure-iot-device').ModuleClient;
var AzureStorage = require('azure-storage');
const Process = require('child_process');

//  const rtspIp = "192.168.31.248";
//  const rtspPort = "8900";
//  const rtspPath = "live";

const storageContainer = process.env.STORAGE_CONTAINER; 

const rtspIp = process.env.RTSP_IP;
const rtspPort = process.env.RTSP_PORT;
const rtspPath = process.env.RTSP_PATH;

var i = 0;
const rtspUrl = `rtsp://${rtspIp}:${rtspPort}/${rtspPath}`;


function uploadImageToBlob(fileName)
{
  //Connection provided thru AZURE_STORAGE_CONNECTION_STRING env variable
  var blobService = AzureStorage.createBlobService();
  blobService.createContainerIfNotExists(storageContainer, {
    publicAccessLevel: 'blob'
  }, function(error, result, response) {
    if (!error) {
      blobService.createBlockBlobFromLocalFile(storageContainer, fileName, fileName, function(error, result, response) {
        if (!error) {
          console.log("Image uploaded to Azure");
        }
      });
    }
  });
}

function TakeAndUploadCaptureFromStream()
{
  //-rtsp_transport tcp  parameter needed to obtain all the packets properly
  var fileName = `capture_${Date.now()}.jpg`
  const ffmpegParams = `-rtsp_transport tcp -y -i ${rtspUrl} -q:v 1 -vframes 1 ${fileName}`;
  console.log(`Running: ffmpeg ${ffmpegParams}`);

  var ffmpegProcess = Process.spawn('ffmpeg', ffmpegParams.split(' '));
  ffmpegProcess.on('exit', (code, signal) => {
    if(code == '1')
      console.log(`Process ffmpeg exited with code ${code} and signal ${signal}.`);
   
      //upload image
      uploadImageToBlob(fileName);
  });
}

Client.fromEnvironment(Transport, function (err, client) {
  if (err) {
    throw err;
  } else {
    client.on('error', function (err) {
      throw err;
    });

    // connect to the Edge instance
    client.open(function (err) {
      if (err) {
        throw err;
      } else {
        console.log('IoT Hub module client initialized');

        //Red of device twin not needed in current implementation
        // client.getTwin(function (err, twin) {
        //   if (err) {
        //       console.error('Error getting twin: ' + err.message);
        //   } 
        //   else {
        //       twin.on('properties.desired', function(delta) {
        //           if (delta.TemperatureThreshold) {
        //               temperatureThreshold = delta.TemperatureThreshold;
        //           }
        //       });
        //   }
        // });

        // Act on input messages to the module.
        client.on('inputMessage', function (inputName, msg) {
          pipeMessage(client, inputName, msg);
        });
      }
    });
  }
});

// This function just pipes the messages without any change.
function pipeMessage(client, inputName, msg) {
  client.complete(msg, printResultFor('Receiving message'));

  if (inputName === 'input1') {
    //No need to process message, incoming message is trigger by itself
    TakeAndUploadCaptureFromStream();
    
    // var message = msg.getBytes().toString('utf8');
    // if (message) {
    //   var outputMsg = new Message(message);
    //   client.sendOutputEvent('output1', outputMsg, printResultFor('Sending received message'));
    // }
  }
}

// Helper function to print results in the console
function printResultFor(op) {
  return function printResult(err, res) {
    if (err) {
      console.log(op + ' error: ' + err.toString());
    }
    if (res) {
      console.log(op + ' status: ' + res.constructor.name);
    }
  };
}
