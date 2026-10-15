import { Injectable } from '@nestjs/common'
import { ReplaySubject } from 'rxjs'

@Injectable()
export class ActivityStreamService {
  private readonly stream = new ReplaySubject<any>(100)

  constructor() {
    console.log('🔥 ActivityStreamService initialized')
  }

  emit(event: any) {
    console.log('📤 SSE EMIT', event)
    this.stream.next({
      data: event   // 🔥 THIS IS THE FIX
    })
  }

  get stream$() {
    return this.stream.asObservable()
  }
}
