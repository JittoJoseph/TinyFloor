package com.spatialmeet.model;

import java.util.ArrayList;
import java.util.List;

public class Room {
    private String id;
    private String name;
    private List<String> users = new ArrayList<>();

    public Room() {}

    public Room(String id, String name) {
        this.id = id;
        this.name = name;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public List<String> getUsers() { return users; }
    public void setUsers(List<String> users) { this.users = users; }

    public void addUser(String userId) {
        if (!users.contains(userId)) {
            users.add(userId);
        }
    }

    public void removeUser(String userId) {
        users.remove(userId);
    }
}