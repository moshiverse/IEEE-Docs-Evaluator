package com.ieee.evaluator.service;

import com.ieee.evaluator.model.PromptTemplate;
import com.ieee.evaluator.repository.PromptTemplateRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Slf4j
public class PromptTemplateService {

    private final PromptTemplateRepository repository;

    public PromptTemplateService(PromptTemplateRepository repository) {
        this.repository = repository;
    }

    // ── Reads ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<PromptTemplate> findAll() {
        return repository.findAllByOrderByNameAsc();
    }

    @Transactional(readOnly = true)
    public PromptTemplate findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Prompt template not found: " + id));
    }

    // ── Writes ────────────────────────────────────────────────────────────────

    @Transactional
    public PromptTemplate create(String name, String content) {
        validateFields(name, content);

        PromptTemplate template = new PromptTemplate();
        template.setName(name.trim());
        template.setContent(content.trim());

        PromptTemplate saved = repository.save(template);
        log.info("Created prompt template id={} name='{}'", saved.getId(), saved.getName());
        return saved;
    }

    @Transactional
    public PromptTemplate update(Long id, String name, String content) {
        validateFields(name, content);

        PromptTemplate template = findById(id);
        template.setName(name.trim());
        template.setContent(content.trim());

        PromptTemplate saved = repository.save(template);
        log.info("Updated prompt template id={} name='{}'", saved.getId(), saved.getName());
        return saved;
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new IllegalArgumentException("Prompt template not found: " + id);
        }
        repository.deleteById(id);
        log.info("Deleted prompt template id={}", id);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void validateFields(String name, String content) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Template name must not be blank.");
        }
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("Template content must not be blank.");
        }
    }
}