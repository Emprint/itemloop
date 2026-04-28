import { Pipe, PipeTransform, inject } from '@angular/core';
import { formatDate } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';

/**
 * Locale-aware date pipe that respects the currently selected @ngx-translate language.
 * Usage: {{ value | localeDate }} or {{ value | localeDate:'d MMM y HH:mm' }}
 */
@Pipe({ name: 'localeDate', standalone: true, pure: false })
export class LocaleDatePipe implements PipeTransform {
  private translate = inject(TranslateService);

  transform(value: string | Date | null | undefined, format = 'd MMM y HH:mm'): string {
    if (!value) return '—';
    const lang = this.translate.currentLang || this.translate.defaultLang || 'en';
    return formatDate(value, format, lang);
  }
}
