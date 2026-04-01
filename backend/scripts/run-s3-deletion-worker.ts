/**
 * S3 Deletion Worker Script
 * 
 * Processes queued S3 file deletion jobs.
 * 
 * Usage:
 *   DRY_RUN=true npm run tsx scripts/run-s3-deletion-worker.ts
 *   npm run tsx scripts/run-s3-deletion-worker.ts
 * 
 * Environment Variables:
 *   DRY_RUN=true - Simulate deletions without actually deleting from S3
 *   BATCH_SIZE=50 - Number of jobs to process per batch (default: 50)
 *   MAX_ITERATIONS=100 - Maximum number of batches to process (default: 100, 0 = unlimited)
 *   SLEEP_MS=1000 - Sleep between batches in milliseconds (default: 1000)
 */

import { processDeletionQueue } from '../src/services/gdpr/s3-cleanup';
import { withJobLock } from '../src/lib/utils/jobLock';

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '50', 10);
const MAX_ITERATIONS = parseInt(process.env.MAX_ITERATIONS || '100', 10);
const SLEEP_MS = parseInt(process.env.SLEEP_MS || '1000', 10);
const DRY_RUN = process.env.DRY_RUN === 'true';

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  // Use job lock to prevent concurrent executions
  await withJobLock('s3-deletion-worker', 600, async () => {
    console.log('🚀 S3 Deletion Worker Starting');
    console.log(`   Mode: ${DRY_RUN ? 'DRY_RUN (simulation)' : 'LIVE (real deletion)'}`);
    console.log(`   Batch Size: ${BATCH_SIZE}`);
    console.log(`   Max Iterations: ${MAX_ITERATIONS === 0 ? 'unlimited' : MAX_ITERATIONS}`);
    console.log(`   Sleep Between Batches: ${SLEEP_MS}ms`);
    console.log('');

    let totalProcessed = 0;
    let totalDeleted = 0;
    let totalFailed = 0;
    let iteration = 0;

    try {
      while (true) {
        iteration++;
        
        if (MAX_ITERATIONS > 0 && iteration > MAX_ITERATIONS) {
          console.log(`\n⏸️  Reached max iterations (${MAX_ITERATIONS}), stopping`);
          break;
        }

        console.log(`\n📦 Batch ${iteration}: Processing up to ${BATCH_SIZE} jobs...`);
        
        const result = await processDeletionQueue(BATCH_SIZE);
        
        totalProcessed += result.processed;
        totalDeleted += result.deleted;
        totalFailed += result.failed;
        
        console.log(`   Processed: ${result.processed}, Deleted: ${result.deleted}, Failed: ${result.failed}`);
        
        // If no jobs were processed, we're done
        if (result.processed === 0) {
          console.log('\n✅ No more jobs to process, queue is empty');
          break;
        }
        
        // Sleep before next batch (unless it was the last batch)
        if (result.processed > 0 && result.processed === BATCH_SIZE) {
          // There might be more jobs, sleep before next batch
          await sleep(SLEEP_MS);
        }
      }
      
      console.log('\n📊 Summary:');
      console.log(`   Total Processed: ${totalProcessed}`);
      console.log(`   Total Deleted: ${totalDeleted}`);
      console.log(`   Total Failed: ${totalFailed}`);
      console.log(`   Iterations: ${iteration}`);
      
      if (DRY_RUN) {
        console.log('\n⚠️  DRY_RUN mode: No files were actually deleted from S3');
      }
      
      console.log('\n✅ Worker completed successfully');
      
    } catch (error) {
      console.error('\n❌ Worker error:', error);
      throw error;
    }
  });
}

main();


