import { Injectable } from '@nestjs/common';
import type { DatasetSummaryList } from './datasets.dto';

const DATASETS: DatasetSummaryList['items'] = [
  {
    id: 'opensyria-geography',
    slug: 'geography',
    name: {
      en: 'Administrative Geography',
      ar: 'الجغرافيا الإدارية',
    },
    description: {
      en: 'Governorates, districts, subdistricts, cities, towns, villages, localities, coordinates, and external IDs.',
      ar: 'المحافظات والمناطق والنواحي والمدن والبلدات والقرى والمحليات والإحداثيات والمعرفات الخارجية.',
    },
    category: 'geography',
    repository: 'data-geography',
    status: 'seed',
    plannedEndpoints: [
      '/api/v1/geography/governorates',
      '/api/v1/geography/districts',
      '/api/v1/geography/subdistricts',
      '/api/v1/geography/localities',
    ],
    version: null,
    updatedAt: null,
  },
  {
    id: 'opensyria-universities',
    slug: 'universities',
    name: {
      en: 'Universities',
      ar: 'الجامعات',
    },
    description: {
      en: 'Public and private universities, campuses, faculties, and related higher education institutions.',
      ar: 'الجامعات العامة والخاصة والحرم الجامعي والكليات ومؤسسات التعليم العالي ذات الصلة.',
    },
    category: 'education',
    repository: 'data-universities',
    status: 'seed',
    plannedEndpoints: ['/api/v1/universities'],
    version: null,
    updatedAt: null,
  },
  {
    id: 'opensyria-transport',
    slug: 'transport',
    name: {
      en: 'Civil Transport Nodes',
      ar: 'نقاط النقل المدني',
    },
    description: {
      en: 'Public airports and seaports first, with railway and bus nodes added only where licensing is clear.',
      ar: 'المطارات والموانئ العامة أولا، ثم محطات السكك والحافلات عندما تكون تراخيص المصادر واضحة.',
    },
    category: 'transport',
    repository: 'data-transport',
    status: 'planned',
    plannedEndpoints: ['/api/v1/transport/airports', '/api/v1/transport/seaports'],
    version: null,
    updatedAt: null,
  },
  {
    id: 'opensyria-heritage',
    slug: 'heritage',
    name: {
      en: 'Cultural and Heritage Sites',
      ar: 'المواقع الثقافية والتراثية',
    },
    description: {
      en: 'World Heritage records, museums, archaeological sites, landmarks, and other reusable cultural references.',
      ar: 'سجلات التراث العالمي والمتاحف والمواقع الأثرية والمعالم والمراجع الثقافية القابلة لإعادة الاستخدام.',
    },
    category: 'heritage',
    repository: 'data-heritage',
    status: 'planned',
    plannedEndpoints: ['/api/v1/heritage/sites'],
    version: null,
    updatedAt: null,
  },
  {
    id: 'opensyria-telecom',
    slug: 'telecom',
    name: {
      en: 'Telecom Dialing Metadata',
      ar: 'بيانات الاتصال الهاتفي',
    },
    description: {
      en: 'Country code, area dialing codes, and public mobile or network prefix metadata.',
      ar: 'رمز الدولة ورموز المناطق وبيانات بادئات شبكات الهاتف المحمول والشبكات العامة.',
    },
    category: 'telecom',
    repository: 'data-telecom',
    status: 'planned',
    plannedEndpoints: ['/api/v1/telecom/dialing'],
    version: null,
    updatedAt: null,
  },
];

@Injectable()
export class DatasetsService {
  listDatasets(): DatasetSummaryList {
    return {
      items: DATASETS,
      count: DATASETS.length,
    };
  }
}
