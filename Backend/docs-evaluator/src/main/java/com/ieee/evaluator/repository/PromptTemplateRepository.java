package com.ieee.evaluator.repository;

import com.ieee.evaluator.model.PromptTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PromptTemplateRepository extends JpaRepository<PromptTemplate, Long> {

    // Returns all templates ordered by name for a clean dropdown list
    List<PromptTemplate> findAllByOrderByNameAsc();
}