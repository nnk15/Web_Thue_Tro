package com.nhatro.service;

import com.nhatro.dto.ViolationReportDtos;
import com.nhatro.entity.ReportStatus;
import com.nhatro.entity.Room;
import com.nhatro.entity.User;
import com.nhatro.entity.ViolationReport;
import com.nhatro.repository.ViolationReportRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import java.util.List;

@ApplicationScoped
public class ViolationReportService {
    @Inject
    ViolationReportRepository reportRepository;

    @Inject
    RoomService roomService;

    @Transactional
    public ViolationReportDtos.ViolationReportResponse create(ViolationReportDtos.CreateViolationReport request, User reporter) {
        Room room = roomService.getRoom(request.roomId());
        ViolationReport report = new ViolationReport();
        report.reporter = reporter;
        report.room = room;
        report.reason = request.reason().trim();
        report.status = ReportStatus.PENDING;
        reportRepository.persist(report);
        return ViolationReportDtos.ViolationReportResponse.from(report);
    }

    @Transactional
    public List<ViolationReportDtos.ViolationReportResponse> listAll() {
        return reportRepository.findAll(Sort.by("createdAt").descending())
                .list()
                .stream()
                .map(ViolationReportDtos.ViolationReportResponse::from)
                .toList();
    }

    @Transactional
    public ViolationReportDtos.ViolationReportResponse resolve(Long id) {
        ViolationReport report = getReport(id);
        report.status = ReportStatus.RESOLVED;
        return ViolationReportDtos.ViolationReportResponse.from(report);
    }

    private ViolationReport getReport(Long id) {
        return reportRepository.findByIdOptional(id)
                .orElseThrow(() -> new WebApplicationException("Không tìm thấy báo cáo vi phạm", Response.Status.NOT_FOUND));
    }
}
