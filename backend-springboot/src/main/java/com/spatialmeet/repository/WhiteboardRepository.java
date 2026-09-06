package com.spatialmeet.repository;

import com.spatialmeet.model.Whiteboard;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WhiteboardRepository extends MongoRepository<Whiteboard, String> {
}
