package com.nhatro.dto;

import com.nhatro.entity.ReportStatus;
import com.nhatro.entity.ViolationReport;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

public final class ViolationReportDtos {
    private ViolationReportDtos() {
    }

    public record CreateViolationReport(
            @NotNull Long roomId,
            @NotBlank String reason
    ) {
    }

    public record ViolationReportResponse(
            Long id,
            Long reporterId,
            String reporterName,
            Long roomId,
            String roomTitle,
            String reason,
            ReportStatus status,
            Instant createdAt
    ) {
        public static ViolationReportResponse from(ViolationReport report) {
            return new ViolationReportResponse(
                    report.id,
                    report.reporter.id,
                    report.reporter.fullName,
                    report.room.id,
                    report.room.title,
                    report.reason,
                    report.status,
                    report.createdAt
            );
        }
    }
}
