import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EventType } from '../../core/models/event-type.model';
import { ConfirmService } from '../../core/services/confirm.service';
import { EventTypeService } from '../../core/services/event-type.service';
import { ToastService } from '../../core/services/toast.service';
import { Icon } from '../../shared/components/icon';

const CODE_PATTERN = /^[A-Z0-9_]+$/;

@Component({
  selector: 'app-event-types',
  imports: [ReactiveFormsModule, Icon],
  templateUrl: './event-types.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventTypes {
  private readonly service = inject(EventTypeService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly types = signal<EventType[]>([]);
  protected readonly loading = signal(true);
  protected readonly editingId = signal<number | null>(null);

  protected readonly createForm = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(CODE_PATTERN)]],
    label: ['', [Validators.required, Validators.maxLength(100)]],
  });
  protected readonly editForm = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(CODE_PATTERN)]],
    label: ['', [Validators.required, Validators.maxLength(100)]],
  });

  constructor() {
    this.load();
  }

  protected upperCaseCode(form: typeof this.createForm): void {
    const control = form.controls.code;
    control.setValue(control.value.toUpperCase().replace(/\s+/g, '_'), { emitEvent: false });
  }

  protected create(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    const { code, label } = this.createForm.getRawValue();
    this.service.create(code, label.trim()).subscribe({
      next: (created) => {
        this.types.update((list) => [...list, created]);
        this.createForm.reset();
        this.toast.success(`Type « ${created.label} » créé`);
      },
      error: (err) => this.toast.error(err),
    });
  }

  protected startEdit(type: EventType): void {
    this.editingId.set(type.id);
    this.editForm.setValue({ code: type.code, label: type.label });
  }

  protected saveEdit(): void {
    const id = this.editingId();
    if (id === null || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const { code, label } = this.editForm.getRawValue();
    this.service.update({ id, code, label: label.trim() }).subscribe({
      next: (updated) => {
        this.types.update((list) => list.map((t) => (t.id === id ? updated : t)));
        this.editingId.set(null);
        this.toast.success('Type mis à jour');
      },
      error: (err) => this.toast.error(err),
    });
  }

  protected async remove(type: EventType): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Supprimer ce type ?',
      message: `Le type « ${type.label} » sera supprimé. Les évènements existants de ce type pourraient être impactés.`,
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    this.service.delete(type.id).subscribe({
      next: () => {
        this.types.update((list) => list.filter((t) => t.id !== type.id));
        this.toast.success('Type supprimé');
      },
      error: (err) => this.toast.error(err),
    });
  }

  private load(): void {
    this.service.getAll().subscribe({
      next: (types) => {
        this.types.set(types);
        this.loading.set(false);
      },
      error: (err) => {
        this.toast.error(err);
        this.loading.set(false);
      },
    });
  }
}
