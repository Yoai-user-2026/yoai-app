#!/usr/bin/env node
/**
 * Neon 跨 region 資料遷移腳本
 *
 * 用法:
 *   OLD_URL=postgresql://... node scripts/migrate-neon.js
 *
 * 環境變數:
 *   OLD_URL  - 來源 DB 連線字串 (舊的)
 *   NEW_URL  - 目標 DB 連線字串 (新的,新加坡)
 *
 * 注意: 跑之前請先在新 DB 上跑 `npx prisma db push` 建表
 */

const { PrismaClient } = require('@prisma/client');

const OLD_URL = process.env.OLD_URL;
const NEW_URL = process.env.NEW_URL;

if (!OLD_URL || !NEW_URL) {
  console.error('❌ 請設定 OLD_URL 和 NEW_URL 環境變數');
  process.exit(1);
}

async function main() {
  console.log('🔌 連線到舊 DB...');
  const oldDb = new PrismaClient({
    datasources: { db: { url: OLD_URL } },
  });

  console.log('🔌 連線到新 DB...');
  const newDb = new PrismaClient({
    datasources: { db: { url: NEW_URL } },
  });

  try {
    // 1. User
    console.log('👤 遷移 User...');
    const users = await oldDb.user.findMany();
    for (const u of users) {
      await newDb.user.upsert({
        where: { id: u.id },
        update: u,
        create: u,
      });
    }
    console.log(`   ✓ ${users.length} 個用戶`);

    // 2. FamilyGroup
    console.log('🏠 遷移 FamilyGroup...');
    const groups = await oldDb.familyGroup.findMany();
    for (const g of groups) {
      await newDb.familyGroup.upsert({
        where: { id: g.id },
        update: g,
        create: g,
      });
    }
    console.log(`   ✓ ${groups.length} 個家庭`);

    // 3. FoodRecord
    console.log('🍱 遷移 FoodRecord...');
    const foods = await oldDb.foodRecord.findMany();
    for (const f of foods) {
      await newDb.foodRecord.upsert({
        where: { id: f.id },
        update: f,
        create: f,
      });
    }
    console.log(`   ✓ ${foods.length} 條食物記錄`);

    // 4. Conversation
    console.log('💬 遷移 Conversation...');
    const convs = await oldDb.conversation.findMany();
    for (const c of convs) {
      await newDb.conversation.upsert({
        where: { id: c.id },
        update: c,
        create: c,
      });
    }
    console.log(`   ✓ ${convs.length} 條對話`);

    // 5. Memory
    console.log('🧠 遷移 Memory...');
    const memories = await oldDb.memory.findMany();
    for (const m of memories) {
      await newDb.memory.upsert({
        where: { id: m.id },
        update: m,
        create: m,
      });
    }
    console.log(`   ✓ ${memories.length} 條記憶`);

    // 6. UsageLog
    console.log('📊 遷移 UsageLog...');
    const logs = await oldDb.usageLog.findMany();
    for (const l of logs) {
      await newDb.usageLog.upsert({
        where: { id: l.id },
        update: l,
        create: l,
      });
    }
    console.log(`   ✓ ${logs.length} 條使用記錄`);

    // 7. Feedback
    console.log('💭 遷移 Feedback...');
    const fbs = await oldDb.feedback.findMany();
    for (const fb of fbs) {
      await newDb.feedback.upsert({
        where: { id: fb.id },
        update: fb,
        create: fb,
      });
    }
    console.log(`   ✓ ${fbs.length} 條反饋`);

    // 8. Session (NextAuth)
    console.log('🔐 遷移 Session...');
    const sessions = await oldDb.session.findMany();
    for (const s of sessions) {
      await newDb.session.upsert({
        where: { id: s.id },
        update: s,
        create: s,
      });
    }
    console.log(`   ✓ ${sessions.length} 個 session`);

    console.log('\n🎉 遷移完成!');
  } catch (e) {
    console.error('❌ 遷移失敗:', e);
    process.exit(1);
  } finally {
    await oldDb.$disconnect();
    await newDb.$disconnect();
  }
}

main();
