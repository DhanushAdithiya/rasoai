// @/actions/photoProcess.js
import Config from 'react-native-config';

export const processPhoto = async (capturedPhotos) => {
  try {
    console.log(`Starting to process ${capturedPhotos.length} photos...`);
    
    // Get server configuration from environment variables
    const serverUrl = `${Config.SERVER_URL}/predict/`;
    console.log(`Using server URL: ${serverUrl}`);
    
    // Process each photo one by one
    for (let i = 0; i < capturedPhotos.length; i++) {
      const photo = capturedPhotos[i];
      console.log(`Processing photo ${i + 1}/${capturedPhotos.length}...`);
      console.log(`Photo URI: ${photo.uri}`);
      
      try {
        // Create FormData for the photo
        const formData = new FormData();
        formData.append('file', {
            uri: photo.uri,
            name: `photo_${i + 1}.jpg`,
            type: 'image/jpeg',
        });
        
        console.log(`Sending request to: ${serverUrl}`);
        
        const serverResponse = await fetch(serverUrl, {
          method: 'POST',
          body: formData,
          headers: {
            // Don't set Content-Type for FormData - let the browser handle it
          },
          timeout: 30000, // 30 second timeout
        });
        
        console.log(`Server response status: ${serverResponse.status}`);
        
        if (serverResponse.ok) {
          const result = await serverResponse.json();
          console.log(`Photo ${i + 1} results:`, result);
          
          // Log detections in a readable format
          if (result.success && result.detections && result.detections.length > 0) {
            console.log(`✅ Found ${result.detections.length} detections in photo ${i + 1}:`);
            result.detections.forEach((detection, idx) => {
              console.log(`  Detection ${idx + 1}:`, {
                class: detection.name || detection.class,
                confidence: detection.confidence?.toFixed(3) || 'N/A',
                coordinates: {
                  x1: Math.round(detection.xmin || detection.x1),
                  y1: Math.round(detection.ymin || detection.y1),
                  x2: Math.round(detection.xmax || detection.x2),
                  y2: Math.round(detection.ymax || detection.y2)
                }
              });
            });
          } else {
            console.log(`❌ No detections found in photo ${i + 1}`);
          }
        } else {
          const errorText = await serverResponse.text();
          console.error(`❌ Failed to process photo ${i + 1}:`, {
            status: serverResponse.status,
            statusText: serverResponse.statusText,
            error: errorText
          });
        }
        
      } catch (photoError) {
        console.error(`Error processing photo ${i + 1}:`, photoError);
        
        // More detailed error logging
        if (photoError.message.includes('Network request failed')) {
          console.error('Network error - check if server is accessible');
        } else if (photoError.message.includes('timeout')) {
          console.error('Request timeout - server might be slow');
        }
      }
      
      // Add a small delay between requests to avoid overwhelming the server
      if (i < capturedPhotos.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('Finished processing all photos');
    
  } catch (error) {
    console.error('Error in processPhoto function:', error);
  }
}