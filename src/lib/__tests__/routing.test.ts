import { describe, it, expect } from 'vitest';
import { resolveDepartmentForCategory, Department } from '../routing';

const sampleDepartments: Department[] = [
  {
    id: 1,
    slug: 'roads',
    name: 'Madurai Corporation – Roads & Engineering',
    categories: ['pothole_damaged_road'],
    email: 'roads@civiclens.invalid',
  },
  {
    id: 2,
    slug: 'water',
    name: 'Water Supply & Drainage (TWAD / Corporation)',
    categories: ['water_leak', 'sewage_overflow', 'open_manhole_drain'],
    email: 'water@civiclens.invalid',
  },
  {
    id: 3,
    slug: 'swm',
    name: 'Solid Waste Management – Madurai Corporation',
    categories: ['garbage_dumping'],
    email: 'swm@civiclens.invalid',
  },
  {
    id: 4,
    slug: 'pcb',
    name: 'Tamil Nadu Pollution Control Board',
    categories: ['air_pollution', 'water_pollution', 'noise_pollution'],
    email: 'pcb@civiclens.invalid',
  },
  {
    id: 5,
    slug: 'elec',
    name: 'Tamil Nadu Electricity Board',
    categories: ['streetlight_electrical'],
    email: 'elec@civiclens.invalid',
  },
  {
    id: 6,
    slug: 'general',
    name: 'Madurai Corporation – General Grievance Cell',
    categories: ['other'],
    email: 'general@civiclens.invalid',
  },
];

describe('Department Routing (lib/routing.ts)', () => {
  it('routes pothole complaints to the roads department', () => {
    const dept = resolveDepartmentForCategory(sampleDepartments, 'pothole_damaged_road');
    expect(dept?.slug).toBe('roads');
  });

  it('routes water leak, sewage overflow, and open manhole to water department', () => {
    expect(resolveDepartmentForCategory(sampleDepartments, 'water_leak')?.slug).toBe('water');
    expect(resolveDepartmentForCategory(sampleDepartments, 'sewage_overflow')?.slug).toBe('water');
    expect(resolveDepartmentForCategory(sampleDepartments, 'open_manhole_drain')?.slug).toBe('water');
  });

  it('routes solid waste to swm department', () => {
    expect(resolveDepartmentForCategory(sampleDepartments, 'garbage_dumping')?.slug).toBe('swm');
  });

  it('routes air, water, and noise pollution to pcb department', () => {
    expect(resolveDepartmentForCategory(sampleDepartments, 'air_pollution')?.slug).toBe('pcb');
    expect(resolveDepartmentForCategory(sampleDepartments, 'water_pollution')?.slug).toBe('pcb');
    expect(resolveDepartmentForCategory(sampleDepartments, 'noise_pollution')?.slug).toBe('pcb');
  });

  it('routes streetlight and electrical hazards to elec department', () => {
    expect(resolveDepartmentForCategory(sampleDepartments, 'streetlight_electrical')?.slug).toBe('elec');
  });

  it('falls back to general department for other or unknown categories', () => {
    expect(resolveDepartmentForCategory(sampleDepartments, 'other')?.slug).toBe('general');
    expect(resolveDepartmentForCategory(sampleDepartments, 'unrecognized_category')?.slug).toBe('general');
  });
});
