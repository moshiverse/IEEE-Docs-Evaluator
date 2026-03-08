package com.ieee.evaluator.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "system_settings")
@Data
public class SystemSetting {
    
    @Id
    @Column(name = "key")
    private String key;
    
    @Column(nullable = false)
    private String value;
    
    @Column(nullable = false)
    private String category;
    
    private String description;
    
    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}