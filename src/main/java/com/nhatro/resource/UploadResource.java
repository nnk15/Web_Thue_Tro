package com.nhatro.resource;

import com.nhatro.dto.UploadDtos;
import com.nhatro.entity.Role;
import com.nhatro.security.AuthContext;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;

@Path("/api/uploads")
public class UploadResource {
    private static final java.nio.file.Path ROOM_UPLOAD_DIR = java.nio.file.Path.of("uploads", "rooms")
            .toAbsolutePath()
            .normalize();
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp", "gif", "mp4", "webm", "mov");

    @Inject
    AuthContext authContext;

    @POST
    @Path("/rooms")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    public UploadDtos.UploadResponse uploadRoomFiles(@RestForm("files") List<FileUpload> files) {
        authContext.requireRole(Role.LANDLORD, Role.ADMIN);
        if (files == null || files.isEmpty()) {
            throw new WebApplicationException("Chưa chọn file để upload", Response.Status.BAD_REQUEST);
        }

        try {
            Files.createDirectories(ROOM_UPLOAD_DIR);
            List<String> urls = new ArrayList<>();
            for (FileUpload file : files) {
                String extension = extensionOf(file.fileName());
                if (!ALLOWED_EXTENSIONS.contains(extension)) {
                    throw new WebApplicationException("Định dạng file không được hỗ trợ", Response.Status.BAD_REQUEST);
                }
                String savedName = UUID.randomUUID() + "." + extension;
                java.nio.file.Path target = ROOM_UPLOAD_DIR.resolve(savedName).normalize();
                Files.copy(file.uploadedFile(), target, StandardCopyOption.REPLACE_EXISTING);
                urls.add("/api/uploads/rooms/" + savedName);
            }
            return new UploadDtos.UploadResponse(urls);
        } catch (IOException error) {
            throw new WebApplicationException("Không lưu được file upload", Response.Status.INTERNAL_SERVER_ERROR);
        }
    }

    @GET
    @Path("/rooms/{fileName}")
    public Response roomFile(@PathParam("fileName") String fileName) {
        if (fileName == null || !fileName.matches("[a-fA-F0-9\\-]{36}\\.[a-zA-Z0-9]+")) {
            throw new WebApplicationException("File không hợp lệ", Response.Status.NOT_FOUND);
        }

        java.nio.file.Path file = ROOM_UPLOAD_DIR.resolve(fileName).normalize();
        if (!file.startsWith(ROOM_UPLOAD_DIR) || !Files.exists(file)) {
            throw new WebApplicationException("Không tìm thấy file", Response.Status.NOT_FOUND);
        }

        return Response.ok(file.toFile(), mediaType(fileName)).build();
    }

    private String extensionOf(String fileName) {
        if (fileName == null || !fileName.contains(".")) {
            throw new WebApplicationException("File không có phần mở rộng", Response.Status.BAD_REQUEST);
        }
        return fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
    }

    private String mediaType(String fileName) {
        String extension = extensionOf(fileName);
        return switch (extension) {
            case "jpg", "jpeg" -> "image/jpeg";
            case "png" -> "image/png";
            case "webp" -> "image/webp";
            case "gif" -> "image/gif";
            case "mp4" -> "video/mp4";
            case "webm" -> "video/webm";
            case "mov" -> "video/quicktime";
            default -> MediaType.APPLICATION_OCTET_STREAM;
        };
    }
}
