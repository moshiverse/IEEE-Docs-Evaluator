package com.ieee.evaluator.repository;

import com.ieee.evaluator.model.ProfessorDocProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProfessorDocProfileRepository extends JpaRepository<ProfessorDocProfile, String> {
}