# Vision Dev Kit - Capture module

This repository contains node.js module which enables you to create photo capture from video stream output produced by custom vision module running on the Vision Dev Kit device.

Currently Vision Dev Kit enables you to deploy only one HW accelerated custom vision model. This model can be deployed using [AIVisionDevKitGetStartedModule](https://github.com/microsoft/vision-ai-developer-kit/tree/master/samples/official/ai-vision-devkit-get-started/modules/AIVisionDevKitGetStartedModule), which very much simplifies vision model deployment, however it doesn't provide out of the box image capture capability. This means you get results from vision model processing, but you are not able to access raw video/image data.   

This module was created with aim to enable image capture capability, so you can implement further processing of video data captured by camera. For instance you can send captured image to Azure to run further image analysis e.g. use Face Recognition. 

### Image capture implementation

Even though there are ways you can obtain images from camera, either using [python capture sample](https://azure.github.io/Vision-AI-DevKit-Pages/docs/train/) or REST interface, both of this approaches causes running module with custom vision model to fail. This solution was inspired by [WebStreamModule](https://github.com/microsoft/vision-ai-developer-kit/tree/master/samples/official/ai-vision-devkit-get-started/modules/WebStreamModule) which surfaces camera video stream thru web. It uses [ffmpeg](https://ffmpeg.org/) libraries, which were used in this solution as well.

ffmpeg library allows to take capture from video stream in following way:

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

Besides taking capture this module automatically uploads image to Azure Storage from where it can get picked up for further processing needs. 

Capture is initiated by any incoming message to the module's input "input1". Idea behind this way of capture activation is following:

Let's consider already stated scenario, where we want to do further image processing in form of Face Recognition only for images containing person. In this scenario, we can send results from module running vision model to Azure Stream Analytics module, which would be responsible for selecting only result messages containing label "person". Only those messages would be directed to Capture Module to initiate image capture. Captured images will be sent to Azure Storage for further processing - in our case face detection. If additional image processing piece can be deployed to Vision Dev Kit, capture module can be adapted so it does not upload image to Azure Storage if it is not desired. This is however not the case for Face API as currently, containerized version supports only x64 architectures.

### How to run the module

Module is expecting following environment variables to be set:

"RTSP_IP":"{Vision Dev Kit Camera IP Address}",

 "RTSP_PORT":"8900",

 "RTSP_PATH":"live",

 "STORAGE_CONTAINER": "{storage container for image upload}",

  "AZURE_STORAGE_CONNECTION_STRING":"{your storage connection string}"

In order to deploy the module to Vision Dev Kit, you should built module docker image using *Dockerfile.arm32v7* dockerfile and subsequently follow standard deployment procedure. Besides copying solution files and installing node packages this dockerfile defines also steps to install ffmpeg libraries to target container.

Capture module can be ran also locally using edge simulator and it can connect to whatever mpeg stream that is accessible. However, as it is using *ffmpeg* libraries, you should have these libraries on your dev machine and they should be added to your PATH environment variable. You can connect capture module even to your Vision Dev Kit camera, considering your dev machine and camera run on same network. 