export class SalesOrderQueryDto {
  q?: string;
  status?: string[];
  page?: number = 1;
  pageSize?: number = 20;
}
