package com.ieee.evaluator.repository;

import com.ieee.evaluator.model.HiddenSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HiddenSubmissionRepository extends JpaRepository<HiddenSubmission, String> {

    // Returns all hidden file IDs as a flat list for easy frontend consumption
    @org.springframework.data.jpa.repository.Query("SELECT h.fileId FROM HiddenSubmission h")
    List<String> findAllFileIds();
}