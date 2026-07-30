package com.example.signlanguage;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class SignlanguageApplication {

    public static void main(String[] args) {
        SpringApplication.run(SignlanguageApplication.class, args);
    }

}
