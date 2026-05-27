#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <WiFiClientSecure.h> 

// local network info
const char* ssid = "wifi name";           // local Wi-Fi Name
const char* password = "wifi pass";       // local Wi-Fi Password. dont forget to clear unless u wanna leak ur info


const char* token_url = "https://spade-prototype-web.onrender.com/api/token/";
const char* ingest_url = "https://spade-prototype-web.onrender.com/api/ingest-reading/";

// backend auth
const char* api_username = "username";
const char* api_password = "userpass";
String jwt_access_token = ""; // cache string container for the token

// to handle Render's SSL requirements
WiFiClientSecure secureClient; 

// offline recording
struct SensorRecord {
    float ph;
    float n;
    float p;
    float k;
};

const int MAX_RECORDS = 10;       // max offline record storage before syncing
SensorRecord buffer[MAX_RECORDS]; // Local struct array allocation
int recordCount = 0;              // pointer tracking amount of logs saved

void setup() {
    Serial.begin(115200);
    
    // 4. Instruct the ESP32 to bypass strict SSL certificate fingerprint checking
    secureClient.setInsecure(); 
    
    WiFi.begin(ssid, password);
    Serial.print("Connecting to Wi-Fi network");
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nNetwork link verified! ESP32 Online.");
}

void loop() {
    // accumulates simulated readings till cache is full (10 records). 
    if (recordCount < MAX_RECORDS) {

        buffer[recordCount].ph = 6.5 + (random(-2, 3) / 10.0);
        buffer[recordCount].n  = 135.0 + random(-5, 6);
        buffer[recordCount].p  = 52.0 + random(-2, 3);
        buffer[recordCount].k  = 205.0 + random(-5, 6);
        
        Serial.printf("Log cached in local memory buffer (%d/%d)\n", recordCount + 1, MAX_RECORDS);
        recordCount++;
    }

    // bulk processing once full to send 10 records at once
    if (recordCount >= MAX_RECORDS) {
        Serial.println("\nStorage buffer filled. Opening transmission pipeline to backend host...");
        
        if (WiFi.status() == WL_CONNECTED) {
            // Validate or renew token signature
            if (jwt_access_token == "") {
                jwt_access_token = getJWTToken();
            }

            // Deliver the multi-object payload array
            if (jwt_access_token != "") {
                if (sendBulkPayload(jwt_access_token)) {
                    Serial.println("Server sync acknowledged. Wiping local memory tracker.");
                    recordCount = 0; 
                }
            }
        } else {
            Serial.println("Sync failed: Device is currently offline. Retaining records safely in memory...");
        }
    }

    delay(3000); // Wait 3 seconds per cycle
}

// for JWT Authentication Token extraction
String getJWTToken() {
    HTTPClient http;
    
    // 5. Pass the secureClient wrapper into the http begin request
    http.begin(secureClient, token_url); 
    http.addHeader("Content-Type", "application/json");

    // unified Version 6 & 7 compatible Json Document format
    JsonDocument doc; 
    doc["username"] = api_username;
    doc["password"] = api_password;
    String requestBody;
    serializeJson(doc, requestBody);

    Serial.println("Firing auth token handshake request...");
    int httpResponseCode = http.POST(requestBody);
    String token = "";

    if (httpResponseCode == 200) {
        String response = http.getString();
        JsonDocument jsonResponse;
        deserializeJson(jsonResponse, response);
        token = jsonResponse["access"].as<String>();
        Serial.println("Security authorization verified!");
    } else {
        Serial.printf("Handshake refused. HTTP Server Status Error: %d\n", httpResponseCode);
    }
    
    http.end();
    return token;
}

// packages the struct array into a single JSON list and pushes to backend
bool sendBulkPayload(String token) {
    HTTPClient http;
    
    // 6. Pass the secureClient wrapper into the ingest request
    http.begin(secureClient, ingest_url); 
    
    // inject headers matching Django REST Framework class-based permission 
    http.addHeader("Content-Type", "application/json");
    String authHeaderValue = "Bearer " + token;
    http.addHeader("Authorization", authHeaderValue.c_str());

    JsonDocument doc; 
    // securely initializes the root document node as a JSON List/Array structure
    JsonArray rootArray = doc.to<JsonArray>();

    // turns the C++ struct data into the multi-nested JSON array string
    for (int i = 0; i < recordCount; i++) {
        JsonObject obj = rootArray.add<JsonObject>(); // V7 safe creation syntax
        obj["event_type"] = "sensor_log";
        obj["fertilizer_type"] = "ESP32 Host Bulk Node";
        obj["ph_level"] = buffer[i].ph;
        obj["nitrogen_val"] = buffer[i].n;
        obj["phosphorus_val"] = buffer[i].p;
        obj["potassium_val"] = buffer[i].k;
    }

    String requestBody;
    serializeJson(doc, requestBody);

    Serial.println("Bulk transferring packet arrays down the network host...");
    int httpResponseCode = http.POST(requestBody);
    bool successFlag = false;

    if (httpResponseCode == 201 || httpResponseCode == 200) {
        Serial.println("Data synced successfully! Server returned 201 Created.");
        Serial.println(http.getString());
        successFlag = true;
    } else if (httpResponseCode == 401) {
        Serial.println("Token expired or revoked. Resetting token reference for recovery.");
        jwt_access_token = ""; // forces a fresh login handshake on the next execution loop
    } else {
        Serial.printf("Ingestion rejected. Server Response Error Code: %d\n", httpResponseCode);
        Serial.println(http.getString());
    }

    http.end();
    return successFlag;
}