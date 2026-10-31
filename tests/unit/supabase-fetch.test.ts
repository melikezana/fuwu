import { afterEach, describe, expect, it, vi } from 'vitest';
import { supabaseFetch } from '@/lib/supabase/fetch';
afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();});
describe('Supabase transport across proxy and server runtimes',()=>{
 it('works without AbortSignal.any and clears its deadline after success',async()=>{
  vi.useFakeTimers();
  const any=vi.spyOn(AbortSignal,'any').mockImplementation(()=>{throw new Error('Unavailable in Next proxy');});
  vi.spyOn(globalThis,'fetch').mockResolvedValue(Response.json({ok:true}));
  expect((await supabaseFetch('http://127.0.0.1:54321/auth/v1/health')).ok).toBe(true);
  expect(any).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);
 });
 it('aborts a stalled request at eight seconds',async()=>{
  vi.useFakeTimers();
  vi.spyOn(globalThis,'fetch').mockImplementation(async(_,init)=>new Promise((_,reject)=>init!.signal!.addEventListener('abort',()=>reject(init!.signal!.reason))));
  const request=supabaseFetch('http://127.0.0.1:54321/auth/v1/health');
  const result=expect(request).rejects.toMatchObject({name:'TimeoutError'});
  await vi.advanceTimersByTimeAsync(8000);await result;expect(vi.getTimerCount()).toBe(0);
 });
 it('preserves caller cancellation and releases its timer',async()=>{
  vi.useFakeTimers();const caller=new AbortController();
  vi.spyOn(globalThis,'fetch').mockImplementation(async(_,init)=>new Promise((_,reject)=>init!.signal!.addEventListener('abort',()=>reject(init!.signal!.reason))));
  const request=supabaseFetch('http://127.0.0.1:54321/auth/v1/user',{signal:caller.signal});
  const result=expect(request).rejects.toThrow('Caller cancelled');caller.abort(new Error('Caller cancelled'));await result;expect(vi.getTimerCount()).toBe(0);
 });
 it('also bounds a response that sends headers but stalls its JSON body',async()=>{
  vi.useFakeTimers();
  vi.spyOn(globalThis,'fetch').mockImplementation(async(_,init)=>new Response(new ReadableStream({start(controller){init!.signal!.addEventListener('abort',()=>controller.error(init!.signal!.reason));}})));
  const result=expect(supabaseFetch('http://127.0.0.1:54321/rest/v1/providers')).rejects.toMatchObject({name:'TimeoutError'});
  await vi.advanceTimersByTimeAsync(8000);await result;expect(vi.getTimerCount()).toBe(0);
 });
});
