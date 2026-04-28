package com.ieee.evaluator.repository;

import com.ieee.evaluator.model.ClassContextProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ClassContextProfileRepository extends JpaRepository<ClassContextProfile, Integer> {
}