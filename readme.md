# Vision Dev Kit - Capture module

This repository contains node.js module which enables image capture from video stream output produced by custom vision module running on the Vision Dev Kit device.

Currently Vision Dev Kit enables you to deploy only one HW accelerated custom vision model. This model can be deployed using [AIVisionDevKitGetStartedModule](https://github.com/microsoft/vision-ai-developer-kit/tree/master/samples/official/ai-vision-devkit-get-started/modules/AIVisionDevKitGetStartedModule), which very much simplifies vision model deployment. However, it doesn't provide out of the box image capture capability. This means you can access vision model processing results, but you are not able to access raw video/image data.   

This module was created with aim to enable image capture capability, so you can implement further processing of images captured by vision dev kit camera, e.g. Face Recognition. 

### Image capture implementation

Even though there are ways how to obtain images from camera, either using [python capture sample](https://azure.github.io/Vision-AI-DevKit-Pages/docs/train/) or REST interface, both of this approaches cause running module with custom vision model to fail. This solution was inspired by [WebStreamModule](https://github.com/microsoft/vision-ai-developer-kit/tree/master/samples/official/ai-vision-devkit-get-started/modules/WebStreamModule) which surfaces camera video stream thru web page. It uses [ffmpeg](https://ffmpeg.org/) libraries, which were used in this solution as well.

ffmpeg library allows you to take capture from video stream in following way:

```javascript
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
    else
      //upload image
      uploadImageToBlob(fileName);
  });
}
```

Besides taking capture, this module automatically uploads image to Azure Storage from where it can get picked up for further processing needs. 

Capture is initiated by any incoming message to the module's input "input1". Idea behind this way of capture activation is following:

Let's consider already stated scenario, where we want to do further image processing in form of Face Recognition, but only for images containing person. In this scenario, we can send results from module running custom vision model to Azure Stream Analytics module, which is responsible for selecting only result messages containing label "person". Only such messages will be directed to Capture Module to initiate image capture. Captured images will be sent to Azure Storage for further processing - in our case face detection. 

### How to run the module

Module is expecting following environment variables to be set:

"RTSP_IP":"{Vision Dev Kit Camera IP Address}",

 "RTSP_PORT":"8900",

 "RTSP_PATH":"live",

 "STORAGE_CONTAINER": "{storage container for image upload}",

  "AZURE_STORAGE_CONNECTION_STRING":"{your storage connection string}"

In order to deploy the module to Vision Dev Kit, you should built module docker image using *Dockerfile.arm32v7* dockerfile and subsequently follow standard edge deployment procedure. Besides copying solution files and installing node packages this dockerfile defines also steps to install ffmpeg libraries to target container. This module expects [AIVisionDevKitGetStartedModule](AIVisionDevKitGetStartedModule) to run on your vision dev kit device. 

Capture module can be ran also locally using edge simulator and it can connect to whatever accessible mpeg stream. However, as it is using *ffmpeg* libraries, you should have these libraries on your dev machine and they should be added to your PATH environment variable. You can connect capture module even to your Vision Dev Kit camera, considering your dev machine and camera run on same network. 