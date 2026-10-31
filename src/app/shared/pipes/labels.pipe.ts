import { Pipe, PipeTransform } from '@angular/core';
import {
  EVENT_STATUS_LABELS,
  EventStatus,
  VISIBILITY_LABELS,
  Visibility,
} from '../../core/models/event.model';
import { USER_ROLE_LABELS, UserRole } from '../../core/models/user.model';

@Pipe({ name: 'statusLabel' })
export class StatusLabelPipe implements PipeTransform {
  transform(value: EventStatus): string {
    return EVENT_STATUS_LABELS[value] ?? value;
  }
}

@Pipe({ name: 'visibilityLabel' })
export class VisibilityLabelPipe implements PipeTransform {
  transform(value: Visibility): string {
    return VISIBILITY_LABELS[value] ?? value;
  }
}

@Pipe({ name: 'roleLabel' })
export class RoleLabelPipe implements PipeTransform {
  transform(value: UserRole): string {
    return USER_ROLE_LABELS[value] ?? value;
  }
}
