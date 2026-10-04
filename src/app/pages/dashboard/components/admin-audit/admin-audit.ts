import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../../services/admin.service';

@Component({
  selector: 'app-admin-audit',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-audit.html',
  styleUrl: './admin-audit.css'
})
export class AdminAudit {
  readonly adminService = inject(AdminService);

  readonly selectedCategory = signal<string>('todos');
  readonly searchQuery = signal<string>('');

  readonly filteredLogs = computed(() => {
    const cat = this.selectedCategory();
    const query = this.searchQuery().trim().toLowerCase();

    return this.adminService.auditLogs().filter(log => {
      const matchCat = cat === 'todos' || log.category.toLowerCase() === cat.toLowerCase();
      const matchQuery = query === '' ||
        log.details.toLowerCase().includes(query) ||
        log.userName.toLowerCase().includes(query) ||
        log.timestamp.includes(query);

      return matchCat && matchQuery;
    });
  });
}
