package com.gym.analyzer;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import javax.annotation.PostConstruct;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@CrossOrigin(origins = "*")
public class VideoUploadController {

    @Value("${analyzer.api.url}")
    private String analyzerApiUrl;

    @Value("${upload.directory}")
    private String uploadDirectory;

    private Path uploadPath;

    @PostConstruct
    public void init() throws IOException {
        // Convert to absolute path to avoid Tomcat temp directory issues
        uploadPath = Paths.get(uploadDirectory).toAbsolutePath().normalize();
        
        System.out.println("=== VIDEO UPLOAD CONTROLLER INITIALIZED ===");
        System.out.println("Upload directory (configured): " + uploadDirectory);
        System.out.println("Upload directory (absolute): " + uploadPath);
        System.out.println("Current working directory: " + Paths.get("").toAbsolutePath());
        
        if (!Files.exists(uploadPath)) {
            System.out.println("Upload directory does not exist, creating: " + uploadPath);
            Files.createDirectories(uploadPath);
            System.out.println("Upload directory created successfully");
        } else {
            System.out.println("Upload directory already exists");
        }
        
        System.out.println("Flask API URL: " + analyzerApiUrl);
        System.out.println("===========================================");
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> uploadVideo(@RequestParam("file") MultipartFile file) {
        
        System.out.println("=== UPLOAD REQUEST RECEIVED ===");
        System.out.println("Timestamp: " + new java.util.Date());
        
        if (file == null) {
            System.err.println("ERROR: file parameter is null");
            return ResponseEntity.badRequest()
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"error\": \"No file parameter received\"}");
        }
        
        System.out.println("File details:");
        System.out.println("  - Original filename: " + file.getOriginalFilename());
        System.out.println("  - Content type: " + file.getContentType());
        System.out.println("  - Size: " + file.getSize() + " bytes (" + (file.getSize() / 1024 / 1024) + " MB)");
        System.out.println("  - Empty: " + file.isEmpty());
        
        if (file.isEmpty()) {
            System.err.println("ERROR: File is empty");
            return ResponseEntity.badRequest()
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"error\": \"No file uploaded or file is empty\"}");
        }

        try {
            // Save uploaded file
            String originalFilename = file.getOriginalFilename();
            Path destPath = uploadPath.resolve(originalFilename);
            
            System.out.println("Saving file to: " + destPath.toAbsolutePath());
            file.transferTo(destPath.toFile());
            System.out.println("File saved successfully");

            // Forward to Flask API
            System.out.println("Forwarding to Flask API: " + analyzerApiUrl);
            String analysisResult = forwardToFlaskAPI(destPath.toFile());
            
            System.out.println("Analysis completed, returning result");
            System.out.println("=== UPLOAD REQUEST COMPLETED ===");
            
            return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .body(analysisResult);

        } catch (IOException e) {
            System.err.println("=== UPLOAD REQUEST FAILED ===");
            System.err.println("IOException: " + e.getMessage());
            e.printStackTrace();
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"error\": \"Failed to save file: " + e.getMessage().replace("\"", "'") + "\"}");
        } catch (Exception e) {
            System.err.println("=== UPLOAD REQUEST FAILED ===");
            System.err.println("Unexpected exception: " + e.getMessage());
            e.printStackTrace();
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"error\": \"Unexpected error: " + e.getMessage().replace("\"", "'") + "\"}");
        }
    }

    private String forwardToFlaskAPI(File videoFile) {
        System.out.println("--- Forwarding to Flask API ---");
        System.out.println("Video file: " + videoFile.getAbsolutePath());
        System.out.println("File exists: " + videoFile.exists());
        System.out.println("File size: " + videoFile.length() + " bytes");
        System.out.println("Target URL: " + analyzerApiUrl);
        
        try {
            RestTemplate restTemplate = new RestTemplate();
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", new FileSystemResource(videoFile));

            HttpEntity<MultiValueMap<String, Object>> requestEntity = 
                new HttpEntity<>(body, headers);

            System.out.println("Sending POST request to Flask...");
            long startTime = System.currentTimeMillis();
            
            ResponseEntity<String> response = restTemplate.postForEntity(
                analyzerApiUrl, 
                requestEntity, 
                String.class
            );

            long elapsed = System.currentTimeMillis() - startTime;
            System.out.println("Flask API responded in " + elapsed + "ms");
            System.out.println("Response status: " + response.getStatusCode());
            System.out.println("Response body preview: " + 
                (response.getBody() != null ? response.getBody().substring(0, Math.min(200, response.getBody().length())) + "..." : "null"));

            return response.getBody();

        } catch (Exception e) {
            // Flask API not available - return mock response
            System.err.println("--- Flask API Error ---");
            System.err.println("Exception type: " + e.getClass().getName());
            System.err.println("Exception message: " + e.getMessage());
            System.err.println("Returning mock response as fallback");
            
            return getMockResponse();
        }
    }

    private String getMockResponse() {
        return "{\n" +
            "  \"mock\": true,\n" +
            "  \"frames\": [\n" +
            "    {\n" +
            "      \"frame_index\": 0,\n" +
            "      \"keypoints\": [\n" +
            "        {\"name\": \"nose\", \"x\": 0.5, \"y\": 0.2},\n" +
            "        {\"name\": \"left_shoulder\", \"x\": 0.4, \"y\": 0.3},\n" +
            "        {\"name\": \"right_shoulder\", \"x\": 0.6, \"y\": 0.3},\n" +
            "        {\"name\": \"left_elbow\", \"x\": 0.35, \"y\": 0.45},\n" +
            "        {\"name\": \"right_elbow\", \"x\": 0.65, \"y\": 0.45},\n" +
            "        {\"name\": \"left_wrist\", \"x\": 0.3, \"y\": 0.6},\n" +
            "        {\"name\": \"right_wrist\", \"x\": 0.7, \"y\": 0.6},\n" +
            "        {\"name\": \"left_hip\", \"x\": 0.42, \"y\": 0.65},\n" +
            "        {\"name\": \"right_hip\", \"x\": 0.58, \"y\": 0.65},\n" +
            "        {\"name\": \"left_knee\", \"x\": 0.4, \"y\": 0.85},\n" +
            "        {\"name\": \"right_knee\", \"x\": 0.6, \"y\": 0.85}\n" +
            "      ],\n" +
            "      \"angles\": {\n" +
            "        \"left_elbow\": 145.5,\n" +
            "        \"right_elbow\": 150.2,\n" +
            "        \"left_knee\": 170.8,\n" +
            "        \"right_knee\": 168.3\n" +
            "      }\n" +
            "    }\n" +
            "  ]\n" +
            "}";
    }
}
