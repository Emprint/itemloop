import { Component } from '@angular/core';
import { BuildingsList } from '../buildings/buildings-list/buildings-list';
import { ZonesList } from '../zones/zones-list/zones-list';
import { LocationsList } from '../locations-list/locations-list';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-location-tabs',
  standalone: true,
  imports: [CommonModule, BuildingsList, ZonesList, LocationsList, TranslateModule],
  templateUrl: './location-tabs.html',
  styleUrl: './location-tabs.scss',
})
export class LocationTabs {
  activeTab: 'locations' | 'zones' | 'buildings' = 'locations';

  setTab(tab: 'locations' | 'zones' | 'buildings') {
    this.activeTab = tab;
  }
}
